import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { ZodError } from "zod";
import {
  MethodParams,
  isMethod,
  type DaemonEvent,
  type Method,
  type RpcErrorBody,
  type RpcRequest,
} from "@downnux/shared";
import { logger } from "./log.ts";
import { ManagerError } from "./manager.ts";

const log = logger("ipc");
const MAX_LINE = 1024 * 1024;

export type Handler = (method: Method, params: unknown) => Promise<unknown> | unknown;

export async function assertSocketFree(socketPath: string): Promise<void> {
  if (fs.existsSync(socketPath) && (await isAlive(socketPath))) {
    throw new Error(`Daemon lain sudah berjalan di ${socketPath}`);
  }
}

/**
 * Server IPC di Unix domain socket (izin 0600, di folder 0700).
 * Hanya proses milik pengguna yang sama yang bisa tersambung.
 */
export class IpcServer {
  private server: net.Server | null = null;
  private subscribers = new Set<net.Socket>();

  constructor(
    private readonly socketPath: string,
    private readonly handler: Handler,
  ) {}

  async listen(): Promise<void> {
    fs.mkdirSync(path.dirname(this.socketPath), { recursive: true, mode: 0o700 });
    if (fs.existsSync(this.socketPath)) {
      if (await isAlive(this.socketPath)) {
        throw new Error(`Daemon lain sudah berjalan di ${this.socketPath}`);
      }
      fs.unlinkSync(this.socketPath); // socket basi dari proses yang mati
    }
    const server = net.createServer((sock) => this.onConnection(sock));
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(this.socketPath, () => resolve());
    });
    fs.chmodSync(this.socketPath, 0o600);
    this.server = server;
    log.info(`Mendengarkan di ${this.socketPath}`);
  }

  broadcast(ev: DaemonEvent): void {
    if (this.subscribers.size === 0) return;
    const line = JSON.stringify(ev) + "\n";
    for (const s of this.subscribers) {
      if (!s.destroyed) s.write(line);
    }
  }

  async close(): Promise<void> {
    for (const s of this.subscribers) s.destroy();
    this.subscribers.clear();
    const srv = this.server;
    this.server = null;
    if (srv) await new Promise<void>((r) => srv.close(() => r()));
    try {
      fs.unlinkSync(this.socketPath);
    } catch {
      // abaikan
    }
  }

  private onConnection(sock: net.Socket): void {
    sock.setEncoding("utf8");
    let buf = "";
    sock.on("data", (chunk: string) => {
      buf += chunk;
      if (buf.length > MAX_LINE && buf.indexOf("\n") < 0) {
        sock.destroy();
        return;
      }
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) void this.onLine(sock, line);
      }
    });
    sock.on("close", () => this.subscribers.delete(sock));
    sock.on("error", () => this.subscribers.delete(sock));
  }

  private async onLine(sock: net.Socket, line: string): Promise<void> {
    let req: RpcRequest;
    try {
      req = JSON.parse(line);
    } catch {
      return this.reply(sock, null, undefined, { code: "BAD_REQUEST", message: "JSON tidak valid" });
    }
    const id = req.id ?? null;
    if (typeof req.method !== "string" || !isMethod(req.method)) {
      return this.reply(sock, id, undefined, { code: "UNKNOWN_METHOD", message: `Method tidak dikenal: ${req.method}` });
    }
    try {
      const params = MethodParams[req.method].parse(req.params ?? {});
      if (req.method === "subscribe") {
        this.subscribers.add(sock);
        return this.reply(sock, id, { ok: true });
      }
      const result = await this.handler(req.method, params);
      this.reply(sock, id, result);
    } catch (err) {
      this.reply(sock, id, undefined, toRpcError(err));
    }
  }

  private reply(sock: net.Socket, id: RpcRequest["id"] | null, result?: unknown, error?: RpcErrorBody): void {
    if (sock.destroyed) return;
    sock.write(JSON.stringify(error ? { id, error } : { id, result }) + "\n");
  }
}

function toRpcError(err: unknown): RpcErrorBody {
  if (err instanceof ZodError) {
    return { code: "BAD_REQUEST", message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  if (err instanceof ManagerError) return { code: err.code, message: err.message };
  log.error("Error tak terduga saat memproses request", err);
  return { code: "INTERNAL", message: (err as Error)?.message ?? String(err) };
}

function isAlive(socketPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createConnection(socketPath);
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("error", () => resolve(false));
  });
}

