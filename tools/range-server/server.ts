/**
 * Server HTTP uji yang mendukung Range, untuk menguji edge case download manager.
 *
 *   GET  /file/<bytes>?name=a.bin&rate=<B/s per koneksi>&norange=1&cd=1
 *   GET  /status/<code>
 *   POST /control/offline?on=1|0     simulasi internet putus (memutus semua koneksi)
 *   GET  /stats                      jumlah request dan koneksi paralel maksimum
 *
 * Isi file deterministik (fungsi dari offset) sehingga hasil bisa diverifikasi tanpa file di disk.
 */
import crypto from "node:crypto";
import http from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { pathToFileURL } from "node:url";

export function byteAt(i: number): number {
  return (i * 31 + Math.floor(i / 251)) & 0xff;
}

export function fillChunk(start: number, len: number): Buffer {
  const b = Buffer.allocUnsafe(len);
  for (let k = 0; k < len; k++) b[k] = byteAt(start + k);
  return b;
}

export function expectedSha256(size: number): string {
  const h = crypto.createHash("sha256");
  const step = 1 << 20;
  for (let off = 0; off < size; off += step) h.update(fillChunk(off, Math.min(step, size - off)));
  return h.digest("hex");
}

export interface RangeServer {
  url: string;
  port: number;
  setOffline(on: boolean): void;
  stats(): { requests: number; rangeRequests: number; maxParallel: number };
  close(): Promise<void>;
}

export async function startRangeServer(port = 0): Promise<RangeServer> {
  let offline = false;
  let requests = 0;
  let rangeRequests = 0;
  let active = 0;
  let maxParallel = 0;
  const sockets = new Set<Socket>();

  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? "/", "http://x");
    if (u.pathname === "/control/offline") {
      offline = u.searchParams.get("on") === "1";
      if (offline) for (const s of sockets) s.destroy();
      res.end(`offline=${offline}\n`);
      return;
    }
    if (u.pathname === "/stats") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ requests, rangeRequests, maxParallel }));
      return;
    }
    if (offline) {
      req.socket.destroy();
      return;
    }
    const st = u.pathname.match(/^\/status\/(\d{3})$/);
    if (st) {
      res.statusCode = Number(st[1]);
      res.end();
      return;
    }
    const m = u.pathname.match(/^\/file\/(\d+)(?:\/.*)?$/);
    if (!m) {
      res.statusCode = 404;
      res.end("not found\n");
      return;
    }
    requests++;
    const size = Number(m[1]);
    const rate = Number(u.searchParams.get("rate") ?? 0);
    const noRange = u.searchParams.get("norange") === "1";
    const name = u.searchParams.get("name");
    const needCookie = u.searchParams.get("cookie");
    if (needCookie && !(req.headers.cookie ?? "").includes(needCookie)) {
      res.statusCode = 403;
      res.end("cookie required\n");
      return;
    }

    let start = 0;
    let end = size - 1;
    const range = req.headers.range;
    if (!noRange) res.setHeader("accept-ranges", "bytes");
    if (range && !noRange) {
      const r = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!r) {
        res.statusCode = 416;
        res.end();
        return;
      }
      rangeRequests++;
      if (r[1]) start = Number(r[1]);
      if (r[2]) end = Math.min(size - 1, Number(r[2]));
      if (!r[1] && r[2]) {
        start = size - Number(r[2]);
        end = size - 1;
      }
      if (start > end || start >= size) {
        res.statusCode = 416;
        res.setHeader("content-range", `bytes */${size}`);
        res.end();
        return;
      }
      res.statusCode = 206;
      res.setHeader("content-range", `bytes ${start}-${end}/${size}`);
    }
    res.setHeader("content-type", "application/octet-stream");
    res.setHeader("content-length", String(end - start + 1));
    if (name && u.searchParams.get("cd") === "1") {
      res.setHeader("content-disposition", `attachment; filename="${name}"`);
    }
    if (req.method === "HEAD") {
      res.end();
      return;
    }

    active++;
    maxParallel = Math.max(maxParallel, active);
    let pos = start;
    const chunk = 64 * 1024;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        active--;
      }
    };
    res.on("close", finish);

    const pump = () => {
      while (pos <= end) {
        if (res.destroyed) return finish();
        const len = Math.min(chunk, end - pos + 1);
        const ok = res.write(fillChunk(pos, len));
        pos += len;
        if (rate > 0) {
          setTimeout(pump, (len / rate) * 1000);
          return;
        }
        if (!ok) {
          res.once("drain", pump);
          return;
        }
      }
      res.end();
      finish();
    };
    pump();
  });

  server.on("connection", (s) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  });
  await new Promise<void>((r) => server.listen(port, "127.0.0.1", () => r()));
  const p = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${p}`,
    port: p,
    setOffline(on) {
      offline = on;
      if (on) for (const s of sockets) s.destroy();
    },
    stats: () => ({ requests, rangeRequests, maxParallel }),
    close: () =>
      new Promise<void>((r) => {
        for (const s of sockets) s.destroy();
        server.close(() => r());
      }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.env.PORT ?? 8077);
  startRangeServer(port).then((s) => {
    console.log(`Range server di ${s.url}`);
    console.log(`  contoh: ${s.url}/file/104857600?name=100MB.bin&cd=1&rate=2000000`);
    console.log(`  putus : curl -X POST '${s.url}/control/offline?on=1'`);
  });
}

