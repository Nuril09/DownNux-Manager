import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
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
const DEFAULT_HTTP_PORT = 44990;

export type Handler = (method: Method, params: unknown) => Promise<unknown> | unknown;

export async function assertSocketFree(socketPath: string): Promise<void> {
  if (fs.existsSync(socketPath) && (await isAlive(socketPath))) {
    throw new Error(`Daemon lain sudah berjalan di ${socketPath}`);
  }
}

/**
 * Server IPC di Unix domain socket + Localhost HTTP/WebSocket server.
 * Mendukung komunikasi dari CLI, native-host, browser, dan desktop GUI.
 */
export class IpcServer {
  private server: net.Server | null = null;
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private subscribers = new Set<net.Socket>();
  private wsClients = new Set<WebSocket>();

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
      fs.unlinkSync(this.socketPath);
    }

    // 1. Unix domain socket
    const server = net.createServer((sock) => this.onConnection(sock));
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(this.socketPath, () => resolve());
    });
    fs.chmodSync(this.socketPath, 0o600);
    this.server = server;
    log.info(`Mendengarkan Unix socket di ${this.socketPath}`);

    // 2. HTTP + WebSocket Server di 127.0.0.1 untuk web GUI & OS info
    const httpServer = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === "/api/sysinfo") {
        let osName = os.type();
        if (osName === "Linux") {
          try {
            const rel = fs.readFileSync("/etc/os-release", "utf8");
            const m = rel.match(/^NAME="?([^"\n]+)"?/m);
            if (m?.[1]) osName = m[1];
          } catch {}
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ os: osName, platform: os.platform(), release: os.release() }));
        return;
      }

      if (req.method === "POST" && req.url === "/api/rpc") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", async () => {
          try {
            const parsed = JSON.parse(body);
            if (typeof parsed.method !== "string" || !isMethod(parsed.method)) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: { code: "UNKNOWN_METHOD", message: "Method unknown" } }));
              return;
            }
            const params = MethodParams[parsed.method].parse(parsed.params ?? {});
            const result = await this.handler(parsed.method, params);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ result }));
          } catch (err) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: toRpcError(err) }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    const wss = new WebSocketServer({ server: httpServer });
    wss.on("connection", (ws) => {
      this.wsClients.add(ws);
      ws.on("close", () => this.wsClients.delete(ws));
      ws.on("message", async (data) => {
        try {
          const req: RpcRequest = JSON.parse(data.toString());
          if (typeof req.method === "string" && isMethod(req.method)) {
            const params = MethodParams[req.method].parse(req.params ?? {});
            const result = await this.handler(req.method, params);
            ws.send(JSON.stringify({ id: req.id, result }));
          }
        } catch (err) {
          ws.send(JSON.stringify({ error: toRpcError(err) }));
        }
      });
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(DEFAULT_HTTP_PORT, "127.0.0.1", () => {
        log.info(`Mendengarkan Localhost HTTP/WS di 127.0.0.1:${DEFAULT_HTTP_PORT}`);
        resolve();
      });
      httpServer.on("error", (e) => {
        log.warn(`Gagal membuka HTTP/WS di port ${DEFAULT_HTTP_PORT}: ${(e as Error).message}`);
        resolve();
      });
    });

    this.httpServer = httpServer;
    this.wss = wss;
  }

  broadcast(ev: DaemonEvent): void {
    const line = JSON.stringify(ev) + "\n";
    for (const s of this.subscribers) {
      if (!s.destroyed) s.write(line);
    }
    const jsonStr = JSON.stringify(ev);
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(jsonStr);
      }
    }
  }

  async close(): Promise<void> {
    for (const s of this.subscribers) s.destroy();
    this.subscribers.clear();
    for (const ws of this.wsClients) ws.close();
    this.wsClients.clear();
    if (this.wss) this.wss.close();
    if (this.httpServer) {
      await new Promise<void>((r) => this.httpServer!.close(() => r()));
    }
    const srv = this.server;
    this.server = null;
    if (srv) await new Promise<void>((r) => srv.close(() => r()));
    try {
      fs.unlinkSync(this.socketPath);
    } catch {}
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


