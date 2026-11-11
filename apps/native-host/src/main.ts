/**
 * Native messaging host: dijalankan oleh browser, meneruskan pesan dari ekstensi ke daemon.
 *
 * Format native messaging: setiap pesan diawali panjang 4 byte (uint32 little-endian), lalu JSON.
 * Pesan dari ekstensi: { id?, method, params }. Balasan: { id, result } | { id, error }.
 *
 * Hanya method di ALLOWED yang diteruskan, supaya ekstensi (atau halaman yang menyalahgunakannya)
 * tidak bisa, misalnya, mematikan daemon atau mengubah pengaturan.
 */
import { spawn } from "node:child_process";
import { DaemonClient, DaemonRpcError, getAppPaths } from "@unduh/shared/node";
import type { Method } from "@unduh/shared";

const ALLOWED = new Set<Method>(["ping", "task.add", "task.list", "task.get", "task.pause", "task.resume"]);
const MAX_IN = 4 * 1024 * 1024; // Chrome membatasi pesan ke host 4 GB, kita jauh lebih ketat.

interface InMsg {
  id?: number | string;
  method?: string;
  params?: unknown;
}

function send(msg: unknown): void {
  const body = Buffer.from(JSON.stringify(msg), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let client: DaemonClient | null = null;

async function getClient(): Promise<DaemonClient> {
  if (client) return client;
  const socketPath = getAppPaths().socketPath;
  const tryConnect = async () => {
    const c = new DaemonClient(socketPath);
    await c.connect(1000);
    c.on("close", () => {
      if (client === c) client = null;
    });
    return c;
  };
  try {
    client = await tryConnect();
    return client;
  } catch {
    // Daemon belum jalan: minta systemd menyalakannya, lalu coba lagi.
    spawn("systemctl", ["--user", "start", "downnux-daemon.service"], { stdio: "ignore" }).on("error", () => {});
  }
  const deadline = Date.now() + 8000;
  for (;;) {
    await sleep(250);
    try {
      client = await tryConnect();
      return client;
    } catch (err) {
      if (Date.now() > deadline) throw new Error(`Aplikasi Unduh tidak berjalan (${(err as Error).message})`);
    }
  }
}

async function handle(msg: InMsg): Promise<void> {
  const id = msg.id ?? null;
  if (typeof msg.method !== "string" || !ALLOWED.has(msg.method as Method)) {
    send({ id, error: { code: "UNKNOWN_METHOD", message: `Method tidak diizinkan: ${msg.method}` } });
    return;
  }
  try {
    const c = await getClient();
    const result = await c.call(msg.method as Method, msg.params as never);
    send({ id, result });
  } catch (err) {
    const code = err instanceof DaemonRpcError ? err.code : "UNAVAILABLE";
    send({ id, error: { code, message: (err as Error).message } });
  }
}

let buf = Buffer.alloc(0);
let inflight = 0;
let stdinEnded = false;

function maybeExit(): void {
  if (stdinEnded && inflight === 0) {
    client?.close();
    process.exit(0);
  }
}

process.stdin.on("data", (chunk: Buffer) => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 4) {
    const len = buf.readUInt32LE(0);
    if (len > MAX_IN) {
      process.exit(1);
    }
    if (buf.length < 4 + len) break;
    const body = buf.subarray(4, 4 + len).toString("utf8");
    buf = buf.subarray(4 + len);
    let msg: InMsg;
    try {
      msg = JSON.parse(body);
    } catch {
      send({ id: null, error: { code: "BAD_REQUEST", message: "JSON tidak valid" } });
      continue;
    }
    inflight++;
    void handle(msg).finally(() => {
      inflight--;
      maybeExit();
    });
  }
});

// Browser menutup stdin saat port diputus / setelah sendNativeMessage selesai.
process.stdin.on("end", () => {
  stdinEnded = true;
  maybeExit();
});

