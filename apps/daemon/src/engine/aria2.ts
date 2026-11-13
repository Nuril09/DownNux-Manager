import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { logger } from "../log.ts";
import type {
  DownloadEngine,
  EngineEvents,
  ErrorKind,
  JobSpec,
  JobStatus,
} from "./types.ts";

const log = logger("aria2");

/** Klasifikasi exit code aria2 (lihat bagian EXIT STATUS di `man aria2c`). */
const ERROR_KINDS: Record<string, ErrorKind> = {
  "1": "limited", // unknown error
  "2": "transient", // timeout
  "3": "fatal", // resource not found (404)
  "4": "fatal", // terlalu banyak "not found"
  "5": "transient", // terlalu lambat
  "6": "transient", // masalah jaringan
  "7": "transient", // unfinished saat shutdown
  "8": "restart", // server tidak mendukung resume
  "9": "fatal", // disk penuh
  "10": "restart", // panjang piece berbeda dengan control file
  "11": "limited", // file yang sama sedang diunduh
  "13": "fatal", // file sudah ada
  "14": "fatal", // gagal rename
  "15": "fatal", // gagal membuka file yang ada
  "16": "fatal", // gagal membuat file
  "17": "fatal", // I/O error
  "18": "fatal", // gagal membuat folder
  "19": "transient", // DNS gagal (internet putus)
  "21": "transient", // perintah FTP gagal
  "22": "limited", // header HTTP tak terduga (403, 5xx, dll.)
  "23": "fatal", // terlalu banyak redirect
  "24": "fatal", // autentikasi HTTP gagal
  "29": "transient", // server overload
  "32": "fatal", // checksum gagal
};

export function classifyAria2Error(code: string | undefined): ErrorKind {
  return (code && ERROR_KINDS[code]) || "limited";
}

export interface Aria2Options {
  /** Path ke aria2c. Kosong = cari otomatis. */
  binary?: string;
  /** Folder untuk log aria2. */
  logDir: string;
  /** File PID aria2, untuk membereskan aria2 yatim dari daemon yang mati mendadak. */
  pidFile: string;
}

/**
 * Jika daemon sebelumnya mati karena kill -9, aria2 lamanya baru berhenti setelah
 * --stop-with-process mendeteksinya (hingga ~1 detik). Dua aria2 menulis file yang sama
 * akan merusak file, jadi pastikan yang lama sudah mati sebelum memulai yang baru.
 */
async function killStaleAria2(pidFile: string): Promise<void> {
  let pid: number;
  try {
    pid = Number(fs.readFileSync(pidFile, "utf8").trim());
  } catch {
    return;
  }
  if (!pid) return;
  const isOurs = () => {
    try {
      const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
      return cmd.includes("aria2c") && cmd.includes("--stop-with-process=");
    } catch {
      return false;
    }
  };
  if (!isOurs()) return;
  log.warn(`Menghentikan aria2 lama (pid ${pid})`);
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }
  const deadline = Date.now() + 5000;
  while (isOurs() && Date.now() < deadline) await sleep(100);
  if (isOurs()) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // abaikan
    }
    await sleep(200);
  }
}

interface RpcStatus {
  gid: string;
  status: string;
  totalLength: string;
  completedLength: string;
  downloadSpeed: string;
  uploadSpeed?: string;
  uploadLength?: string;
  connections: string;
  numSeeders?: string;
  pieceLength?: string;
  numPieces?: string;
  bitfield?: string;
  errorCode?: string;
  errorMessage?: string;
  files?: { path: string }[];
  bittorrent?: {
    info?: { name?: string };
    mode?: string;
  };
  infoHash?: string;
  followedBy?: string[];
}

export function findAria2Binary(preferred?: string): string | null {
  const candidates = [
    preferred,
    process.env.UNDUH_ARIA2C,
    ...(process.env.PATH ?? "").split(":").map((d) => d && path.join(d, "aria2c")),
    path.join(os.homedir(), ".local", "bin", "aria2c"),
    "/usr/bin/aria2c",
    "/usr/local/bin/aria2c",
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      fs.accessSync(c, fs.constants.X_OK);
      return c;
    } catch {
      // lanjut
    }
  }
  return null;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Engine berbasis aria2 yang dikendalikan lewat JSON-RPC di 127.0.0.1 dengan token acak.
 * Proses aria2 adalah anak dari daemon dan memakai --stop-with-process sehingga ikut
 * berhenti jika daemon mati (termasuk kill -9). Progres tetap aman di file kontrol .aria2.
 */
export class Aria2Engine extends EventEmitter<EngineEvents> implements DownloadEngine {
  readonly name = "aria2";
  private proc: ChildProcess | null = null;
  private port = 0;
  private secret = crypto.randomBytes(24).toString("hex");
  private rpcId = 0;
  private ver = "";
  private stopping = false;
  private globalLimit = 0;
  private restartAttempts = 0;

  constructor(private readonly opts: Aria2Options) {
    super();
  }

  version(): string {
    return this.ver;
  }

  async start(): Promise<void> {
    this.stopping = false;
    const bin = findAria2Binary(this.opts.binary);
    if (!bin) {
      throw new Error(
        "aria2c tidak ditemukan. Pasang dengan `sudo apt install aria2` atau isi aria2Path di pengaturan.",
      );
    }
    this.port = await freePort();
    fs.mkdirSync(this.opts.logDir, { recursive: true });
    await killStaleAria2(this.opts.pidFile);
    const args = [
      "--enable-rpc=true",
      "--rpc-listen-all=false",
      `--rpc-listen-port=${this.port}`,
      `--rpc-secret=${this.secret}`,
      `--stop-with-process=${process.pid}`,
      // Konkurensi diatur oleh manager, bukan aria2.
      "--max-concurrent-downloads=64",
      "--continue=true",
      "--always-resume=true",
      "--auto-file-renaming=true",
      "--allow-overwrite=false",
      "--content-disposition-default-utf8=true",
      // aria2 menangani putus sesaat; putus lama ditangani manager (status "retrying").
      "--max-tries=5",
      "--retry-wait=3",
      "--connect-timeout=15",
      "--timeout=30",
      "--min-split-size=1M",
      // Simpan file kontrol sering agar crash/mati listrik kehilangan progres minimal.
      "--auto-save-interval=5",
      "--disk-cache=4M",
      "--file-allocation=none",
      "--summary-interval=0",
      "--console-log-level=warn",
      "--log-level=warn",
      `--log=${path.join(this.opts.logDir, "aria2.log")}`,
      "--check-certificate=true",
      "--http-accept-gzip=false",
      // BitTorrent & Magnet engine settings
      "--enable-dht=true",
      "--enable-peer-exchange=true",
      "--bt-enable-lpd=true",
      "--bt-max-peers=128",
      "--follow-torrent=mem",
      "--seed-time=0",
      "--peer-id-prefix=-DN0040-",
      "--bt-tracker-connect-timeout=10",
      "--bt-tracker-timeout=10",
      "--bt-tracker=udp://tracker.opentrackr.org:1337/announce,udp://open.tracker.cl:1337/announce,udp://tracker.torrent.eu.org:451/announce,udp://open.stealth.si:80/announce,udp://tracker.moeking.me:6969/announce,http://tracker.openbittorrent.com:80/announce",
    ];
    if (this.globalLimit > 0) args.push(`--max-overall-download-limit=${this.globalLimit}`);

    const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    this.proc = proc;
    if (proc.pid) fs.writeFileSync(this.opts.pidFile, String(proc.pid), { mode: 0o600 });
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (d: string) => log.warn(d.trim()));
    proc.on("exit", (code, signal) => {
      if (this.proc === proc) this.proc = null;
      if (this.stopping) return;
      log.error(`aria2 berhenti tak terduga (code=${code}, signal=${signal}). Menyalakan ulang...`);
      void this.restart();
    });

    // Tunggu sampai RPC siap.
    const deadline = Date.now() + 10_000;
    for (;;) {
      try {
        const v = await this.rpc<{ version: string }>("aria2.getVersion");
        this.ver = v.version;
        break;
      } catch (err) {
        if (Date.now() > deadline || !this.proc) {
          proc.kill("SIGKILL");
          throw new Error(`aria2 gagal start: ${(err as Error).message}`);
        }
        await sleep(100);
      }
    }
    this.restartAttempts = 0;
    log.info(`aria2 ${this.ver} siap (pid ${proc.pid}, port ${this.port})`);
  }

  private async restart(): Promise<void> {
    this.restartAttempts++;
    await sleep(Math.min(30_000, 500 * 2 ** this.restartAttempts));
    if (this.stopping) return;
    try {
      await this.start();
      this.emit("restarted");
    } catch (err) {
      log.error("Gagal menyalakan ulang aria2", err);
      void this.restart();
    }
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const proc = this.proc;
    if (!proc) return;
    const exited = new Promise<void>((r) => proc.once("exit", () => r()));
    try {
      // shutdown biasa: aria2 menyimpan file kontrol untuk semua download aktif.
      await this.rpc("aria2.shutdown");
    } catch {
      proc.kill("SIGTERM");
    }
    const timeout = sleep(5000).then(() => "timeout" as const);
    if ((await Promise.race([exited, timeout])) === "timeout") proc.kill("SIGKILL");
    this.proc = null;
  }

  async add(spec: JobSpec): Promise<string> {
    const options: Record<string, string | string[]> = {
      dir: spec.dir,
      split: String(spec.connections),
      "max-connection-per-server": String(Math.min(16, spec.connections)),
    };
    if (spec.filename) options.out = spec.filename;
    if (spec.speedLimit && spec.speedLimit > 0) options["max-download-limit"] = String(spec.speedLimit);
    const h = spec.headers;
    if (h?.cookie) options.header = [`Cookie: ${h.cookie}`];
    if (h?.referer) options.referer = h.referer;
    if (h?.userAgent) options["user-agent"] = h.userAgent;

    // 1. BitTorrent from Base64
    if (spec.torrentBase64) {
      return this.rpc<string>("aria2.addTorrent", [spec.torrentBase64, [], options]);
    }

    // 2. BitTorrent from local .torrent file
    if (spec.url.startsWith("file://") || spec.url.startsWith("/")) {
      const filePath = spec.url.replace(/^file:\/\//, "");
      if (filePath.endsWith(".torrent") && fs.existsSync(filePath)) {
        const b64 = fs.readFileSync(filePath).toString("base64");
        return this.rpc<string>("aria2.addTorrent", [b64, [], options]);
      }
    }

    // 3. Magnet or Standard HTTP/HTTPS
    return this.rpc<string>("aria2.addUri", [[spec.url], options]);
  }

  async stopJob(gid: string): Promise<void> {
    try {
      await this.rpc("aria2.forceRemove", [gid]);
    } catch {
      // Sudah selesai/hilang: tidak masalah.
    }
    // Tunggu sampai aria2 benar-benar melepas file sebelum job yang sama dimulai lagi.
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      try {
        const s = await this.rpc<{ status: string }>("aria2.tellStatus", [gid, ["status"]]);
        if (s.status !== "active" && s.status !== "waiting" && s.status !== "paused") break;
      } catch {
        break;
      }
      await sleep(50);
    }
    try {
      await this.rpc("aria2.removeDownloadResult", [gid]);
    } catch {
      // abaikan
    }
  }

  async statusMany(gids: string[]): Promise<Map<string, JobStatus | null>> {
    const out = new Map<string, JobStatus | null>();
    if (gids.length === 0) return out;
    const keys = [
      "gid",
      "status",
      "totalLength",
      "completedLength",
      "downloadSpeed",
      "uploadSpeed",
      "uploadLength",
      "connections",
      "numSeeders",
      "pieceLength",
      "numPieces",
      "bitfield",
      "errorCode",
      "errorMessage",
      "files",
      "bittorrent",
      "infoHash",
      "followedBy",
    ];
    const calls = gids.map((gid) => ({
      methodName: "aria2.tellStatus",
      params: [`token:${this.secret}`, gid, keys],
    }));
    const results = await this.rpcRaw<unknown[]>("system.multicall", [calls]);
    results.forEach((r, i) => {
      const gid = gids[i]!;
      // multicall: sukses = [hasil], gagal = {code, message}
      if (!Array.isArray(r)) {
        out.set(gid, null);
        return;
      }
      const s = r[0] as RpcStatus;
      const isError = s.status === "error";
      const isTorrent = Boolean(s.bittorrent || s.infoHash);
      const torrentName = s.bittorrent?.info?.name;
      const filePath = s.files?.[0]?.path ?? "";

      out.set(gid, {
        state: s.status as JobStatus["state"],
        totalBytes: Number(s.totalLength) || 0,
        completedBytes: Number(s.completedLength) || 0,
        speed: Number(s.downloadSpeed) || 0,
        uploadSpeed: Number(s.uploadSpeed) || 0,
        uploadBytes: Number(s.uploadLength) || 0,
        connections: Number(s.connections) || 0,
        numSeeders: Number(s.numSeeders) || 0,
        pieceLength: Number(s.pieceLength) || 0,
        numPieces: Number(s.numPieces) || 0,
        bitfield: s.bitfield || "",
        isTorrent,
        followedBy: s.followedBy,
        path: filePath || torrentName || "",
        error: isError
          ? {
              code: `aria2:${s.errorCode ?? "?"}`,
              message: s.errorMessage || `aria2 error ${s.errorCode}`,
              kind: classifyAria2Error(s.errorCode),
            }
          : null,
      });
    });
    return out;
  }

  async setGlobalSpeedLimit(bytesPerSec: number): Promise<void> {
    this.globalLimit = bytesPerSec;
    if (this.proc) {
      await this.rpc("aria2.changeGlobalOption", [{ "max-overall-download-limit": String(bytesPerSec) }]);
    }
  }

  private rpc<T>(method: string, params: unknown[] = []): Promise<T> {
    return this.rpcRaw<T>(method, [`token:${this.secret}`, ...params]);
  }

  private async rpcRaw<T>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(`http://127.0.0.1:${this.port}/jsonrpc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: String(++this.rpcId), method, params }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json()) as { result?: T; error?: { code: number; message: string } };
    if (body.error) throw new Error(`${method}: ${body.error.message}`);
    return body.result as T;
  }
}
