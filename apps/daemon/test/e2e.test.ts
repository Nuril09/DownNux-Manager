/**
 * Tes end-to-end daemon: daemon asli + aria2 asli + server HTTP uji lokal.
 * Mencakup kriteria penerimaan PRD 6.2 (kill -9, putus koneksi, cancel).
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Task, TaskStatus } from "@downnux/shared";
import { DaemonClient } from "@downnux/shared/node";
import { expectedSha256, startRangeServer, type RangeServer } from "../../../tools/range-server/server.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const daemonEntry = path.resolve(here, "../src/main.ts");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Harness {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "unduh-test-"));
  dl = path.join(this.home, "dl");
  proc: ChildProcess | null = null;
  client: DaemonClient | null = null;
  log = "";

  get socket() {
    return path.join(this.home, "run", "daemon.sock");
  }

  async start(): Promise<DaemonClient> {
    fs.mkdirSync(this.dl, { recursive: true });
    this.proc = spawn(process.execPath, ["--import", "tsx", "--no-warnings", daemonEntry], {
      env: { ...process.env, UNDUH_HOME: this.home, UNDUH_LOG_LEVEL: "debug" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    this.proc.stderr!.on("data", (d) => (this.log += d));
    const deadline = Date.now() + 15_000;
    for (;;) {
      const c = new DaemonClient(this.socket);
      try {
        await c.connect(500);
        await c.call("ping");
        this.client = c;
        return c;
      } catch {
        c.close();
        if (Date.now() > deadline) throw new Error("Daemon tidak start:\n" + this.log);
        await sleep(150);
      }
    }
  }

  async kill9(): Promise<void> {
    const p = this.proc!;
    const exited = new Promise((r) => p.once("exit", r));
    p.kill("SIGKILL");
    await exited;
    this.client?.close();
    this.client = null;
  }

  async stop(): Promise<void> {
    this.client?.close();
    this.client = null;
    if (!this.proc || this.proc.exitCode !== null) return;
    const p = this.proc;
    const exited = new Promise((r) => p.once("exit", r));
    p.kill("SIGTERM");
    await Promise.race([exited, sleep(3000).then(() => {
      try { p.kill("SIGKILL"); } catch {}
    })]);
  }

  cleanup() {
    fs.rmSync(this.home, { recursive: true, force: true });
  }
}

async function waitFor(
  c: DaemonClient,
  id: string,
  pred: (t: Task) => boolean,
  timeoutMs = 30_000,
): Promise<Task> {
  const deadline = Date.now() + timeoutMs;
  let last: Task | undefined;
  while (Date.now() < deadline) {
    last = await c.call("task.get", { id });
    if (pred(last)) return last;
    await sleep(200);
  }
  throw new Error(`Timeout menunggu kondisi. Status terakhir: ${JSON.stringify(last)}`);
}

const is = (...s: TaskStatus[]) => (t: Task) => s.includes(t.status);

function sha256File(p: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

describe("daemon e2e", () => {
  let srv: RangeServer;
  const h = new Harness();
  let c: DaemonClient;

  before(async () => {
    srv = await startRangeServer();
    c = await h.start();
  });

  after(async () => {
    c?.close();
    await h.stop();
    await srv.close();
    h.cleanup();
  });

  test("download multi-koneksi selesai dan isinya benar", async () => {
    const size = 8 * 1024 * 1024;
    const t = await c.call("task.add", {
      url: `${srv.url}/file/${size}?name=multi.bin&cd=1&rate=1500000`,
      dir: h.dl,
      connections: 8,
    });
    const done = await waitFor(c, t.id, is("completed", "failed"));
    assert.equal(done.status, "completed", JSON.stringify(done.error));
    assert.equal(done.filename, "multi.bin", "nama file dari Content-Disposition");
    assert.equal(sha256File(path.join(h.dl, "multi.bin")), expectedSha256(size));
    assert.ok(srv.stats().maxParallel > 1, "harus memakai lebih dari satu koneksi");
    assert.ok(!fs.existsSync(path.join(h.dl, "multi.bin.aria2")), "file kontrol dihapus setelah selesai");
  });

  test("pause menghentikan progres, resume melanjutkan sampai selesai", async () => {
    const size = 6 * 1024 * 1024;
    const t = await c.call("task.add", {
      url: `${srv.url}/file/${size}?name=pause.bin&cd=1&rate=300000`,
      dir: h.dl,
      connections: 4,
    });
    await waitFor(c, t.id, (x) => x.completedBytes > 512 * 1024);
    const paused = await c.call("task.pause", { id: t.id });
    assert.equal(paused.status, "paused");
    const before = fs.statSync(path.join(h.dl, "pause.bin")).size;
    await sleep(1500);
    const p2 = await c.call("task.get", { id: t.id });
    assert.equal(p2.status, "paused");
    assert.equal(p2.speed, 0);
    assert.ok(fs.existsSync(path.join(h.dl, "pause.bin.aria2")), "file kontrol tetap ada saat pause");
    assert.equal(fs.statSync(path.join(h.dl, "pause.bin")).size, before);

    const reqBefore = srv.stats().rangeRequests;
    await c.call("task.resume", { id: t.id });
    const done = await waitFor(c, t.id, is("completed", "failed"), 60_000);
    assert.equal(done.status, "completed", JSON.stringify(done.error));
    assert.ok(srv.stats().rangeRequests > reqBefore);
    assert.equal(sha256File(path.join(h.dl, "pause.bin")), expectedSha256(size));
  });

  test("kill -9 pada daemon: download pulih dan selesai setelah daemon start lagi", async () => {
    const size = 10 * 1024 * 1024;
    const t = await c.call("task.add", {
      url: `${srv.url}/file/${size}?name=crash.bin&cd=1&rate=250000`,
      dir: h.dl,
      connections: 8,
    });
    await waitFor(c, t.id, (x) => x.completedBytes > 2 * 1024 * 1024, 30_000);
    await h.kill9();
    c = await h.start();
    const resumed = await c.call("task.get", { id: t.id });
    assert.ok(["queued", "downloading"].includes(resumed.status), `status setelah restart: ${resumed.status}`);
    const done = await waitFor(c, t.id, is("completed", "failed"), 60_000);
    assert.equal(done.status, "completed", JSON.stringify(done.error));
    assert.equal(sha256File(path.join(h.dl, "crash.bin")), expectedSha256(size));
  });

  test("internet putus: tidak berhenti, retry otomatis, lalu selesai", async () => {
    const size = 4 * 1024 * 1024;
    const t = await c.call("task.add", {
      url: `${srv.url}/file/${size}?name=offline.bin&cd=1&rate=200000`,
      dir: h.dl,
      connections: 4,
    });
    await waitFor(c, t.id, (x) => x.completedBytes > 256 * 1024);
    srv.setOffline(true);
    await sleep(6000);
    const mid = await c.call("task.get", { id: t.id });
    assert.ok(["downloading", "retrying", "queued"].includes(mid.status), `tidak boleh berhenti: ${mid.status}`);
    srv.setOffline(false);
    const done = await waitFor(c, t.id, is("completed", "failed", "canceled"), 120_000);
    assert.equal(done.status, "completed", JSON.stringify(done.error));
    assert.equal(sha256File(path.join(h.dl, "offline.bin")), expectedSha256(size));
  });

  test("cancel menghapus file parsial", async () => {
    const t = await c.call("task.add", {
      url: `${srv.url}/file/${20 * 1024 * 1024}?name=cancel.bin&cd=1&rate=200000`,
      dir: h.dl,
    });
    await waitFor(c, t.id, (x) => x.completedBytes > 100 * 1024 && x.filename !== "");
    const canceled = await c.call("task.cancel", { id: t.id });
    assert.equal(canceled.status, "canceled");
    assert.ok(!fs.existsSync(path.join(h.dl, "cancel.bin")));
    assert.ok(!fs.existsSync(path.join(h.dl, "cancel.bin.aria2")));
  });

  test("404 menjadi failed dengan alasan yang jelas", async () => {
    const t = await c.call("task.add", { url: `${srv.url}/status/404`, dir: h.dl });
    const done = await waitFor(c, t.id, is("completed", "failed"), 30_000);
    assert.equal(done.status, "failed");
    assert.ok(done.error?.message);
  });

  test("server tanpa Range: fallback satu koneksi tetap selesai", async () => {
    const size = 2 * 1024 * 1024;
    const t = await c.call("task.add", {
      url: `${srv.url}/file/${size}?name=norange.bin&cd=1&norange=1`,
      dir: h.dl,
      connections: 8,
    });
    const done = await waitFor(c, t.id, is("completed", "failed"));
    assert.equal(done.status, "completed", JSON.stringify(done.error));
    assert.equal(sha256File(path.join(h.dl, "norange.bin")), expectedSha256(size));
  });

  test("cookie dari browser diteruskan ke server", async () => {
    const size = 1024 * 1024;
    const t = await c.call("task.add", {
      url: `${srv.url}/file/${size}?name=cookie.bin&cd=1&cookie=sesi%3Drahasia`,
      dir: h.dl,
      headers: { cookie: "sesi=rahasia; lain=1", referer: "https://contoh.id/", userAgent: "UnduhTest/1.0" },
      source: "browser",
    });
    const done = await waitFor(c, t.id, is("completed", "failed", "retrying"));
    assert.equal(done.status, "completed", JSON.stringify(done.error));
  });

  test("validasi input: URL non-http ditolak", async () => {
    await assert.rejects(c.call("task.add", { url: "file:///etc/passwd" }), /http/);
  });
});

