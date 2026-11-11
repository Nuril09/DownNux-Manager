import net from "node:net";
import { EventEmitter } from "node:events";
import type {
  DaemonEvent,
  Method,
  MethodResults,
  ParamsOf,
  RpcErrorBody,
  RpcResponse,
} from "../protocol.ts";
import { getAppPaths } from "./paths.ts";

export class DaemonRpcError extends Error {
  readonly code: RpcErrorBody["code"];
  constructor(body: RpcErrorBody) {
    super(body.message);
    this.name = "DaemonRpcError";
    this.code = body.code;
  }
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

/**
 * Klien daemon untuk proses Node (CLI, native host, tes).
 * Event: "event" (DaemonEvent), "close".
 */
export class DaemonClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private buffer = "";

  constructor(private readonly socketPath = getAppPaths().socketPath) {
    super();
  }

  connect(timeoutMs = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection(this.socketPath);
      const timer = setTimeout(() => {
        sock.destroy();
        reject(new Error(`Timeout menyambung ke daemon di ${this.socketPath}`));
      }, timeoutMs);
      sock.once("connect", () => {
        clearTimeout(timer);
        this.socket = sock;
        resolve();
      });
      sock.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      sock.setEncoding("utf8");
      sock.on("data", (chunk: string) => this.onData(chunk));
      sock.on("close", () => {
        for (const p of this.pending.values()) p.reject(new Error("Koneksi ke daemon tertutup"));
        this.pending.clear();
        this.socket = null;
        this.emit("close");
      });
    });
  }

  call<M extends Method>(method: M, params?: ParamsOf<M>): Promise<MethodResults[M]> {
    const sock = this.socket;
    if (!sock) return Promise.reject(new Error("Belum tersambung ke daemon"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      sock.write(JSON.stringify({ id, method, params: params ?? {} }) + "\n");
    });
  }

  close(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      let msg: RpcResponse | DaemonEvent;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if ("event" in msg) {
        this.emit("event", msg);
        continue;
      }
      const p = typeof msg.id === "number" ? this.pending.get(msg.id) : undefined;
      if (!p) continue;
      this.pending.delete(msg.id as number);
      if ("error" in msg) p.reject(new DaemonRpcError(msg.error));
      else p.resolve(msg.result);
    }
  }
}

