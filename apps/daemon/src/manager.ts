import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AddTaskInput, type AddTaskInput as AddTaskInputT, type Task } from "@downnux/shared";
import { toPublicTask, type StoredTask, type TaskStore } from "./db.ts";
import type { DownloadEngine, JobError, JobStatus } from "./engine/types.ts";
import { resolveTargetDir, safeJoin, sanitizeFilename, unlinkQuiet } from "./fsutil.ts";
import { logger } from "./log.ts";
import type { SettingsStore } from "./settings.ts";

const log = logger("manager");

export class ManagerError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "INVALID_STATE" | "BAD_REQUEST",
    message: string,
  ) {
    super(message);
  }
}

interface Runtime {
  jobId: string | null;
  speed: number;
  activeConnections: number;
  nextRetryAt: number | null;
  retryTimer: NodeJS.Timeout | null;
  dirty: boolean;
  isTorrent?: boolean;
  uploadSpeed?: number;
  uploadBytes?: number;
  numSeeders?: number;
  pieceLength?: number;
  numPieces?: number;
  bitfield?: string;
  speedHistory?: number[];
  torrentBase64?: string;
}

const TICK_MS = 1000;
const PERSIST_EVERY_TICKS = 5;
const LIMITED_RETRY_MAX = 8;
const RESTART_MAX = 3;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 60_000;

export interface ManagerEvents {
  task: [Task];
  removed: [string];
}

/**
 * Pemilik state semua download. Menjalankan state machine PRD bagian 10:
 * hanya cancel() (aksi pengguna) dan error fatal yang mengakhiri download.
 * Semua error lain berujung retry otomatis.
 */
export class DownloadManager extends EventEmitter<ManagerEvents> {
  private tasks = new Map<string, StoredTask>();
  private rt = new Map<string, Runtime>();
  private ticker: NodeJS.Timeout | null = null;
  private ticking = false;
  private tickCount = 0;
  private restartCounts = new Map<string, number>();

  constructor(
    private readonly store: TaskStore,
    private readonly engine: DownloadEngine,
    private readonly settings: SettingsStore,
  ) {
    super();
  }

  /** Muat state dan lanjutkan download yang terputus (crash, reboot, atau kill). */
  init(): void {
    const autoResume = this.settings.get().autoResumeOnStart;
    for (const t of this.store.all()) {
      if (t.status === "downloading" || t.status === "retrying" || t.status === "merging") {
        t.status = autoResume ? "queued" : "paused";
        t.updatedAt = Date.now();
        this.store.upsert(t);
      }
      this.tasks.set(t.id, t);
      this.rt.set(t.id, emptyRuntime());
    }
    this.engine.on("restarted", () => this.onEngineRestarted());
    this.ticker = setInterval(() => void this.tick(), TICK_MS);
    this.schedule();
  }

  async shutdown(): Promise<void> {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    for (const [id, r] of this.rt) {
      if (r.retryTimer) clearTimeout(r.retryTimer);
      const t = this.tasks.get(id);
      if (t) this.store.upsert(t);
    }
    // Status "downloading" sengaja dibiarkan di DB supaya dilanjutkan saat daemon start lagi.
  }

  list(): Task[] {
    return [...this.tasks.values()].map((t) => this.toPublic(t));
  }

  get(id: string): Task {
    return this.toPublic(this.mustGet(id));
  }

  add(raw: AddTaskInputT): Task {
    const input = AddTaskInput.parse(raw);
    const s = this.settings.get();
    const dir = resolveTargetDir(input.dir || this.settings.downloadDir());
    const now = Date.now();
    let defaultReferer = "";
    try {
      defaultReferer = new URL(input.url).origin + "/";
    } catch {}

    const headers = {
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      referer: defaultReferer,
      ...(input.headers || {}),
    };

    const t: StoredTask = {
      id: crypto.randomUUID(),
      url: input.url,
      dir,
      filename: input.filename ? sanitizeFilename(input.filename) : "",
      status: input.start ? "queued" : "paused",
      totalBytes: 0,
      completedBytes: 0,
      connections: input.connections ?? s.defaultConnections,
      source: input.source,
      headers: headers,
      retryCount: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    const rt = emptyRuntime();
    if (input.torrentBase64) rt.torrentBase64 = input.torrentBase64;
    this.tasks.set(t.id, t);
    this.rt.set(t.id, rt);
    this.store.upsert(t);
    log.info(`Tambah ${t.id} ${t.url}`);
    if (s.notifyOnStart) {
      try {
        const title = s.language === "en" ? "DownNux Manager · Download Started" : "DownNux Manager · Unduhan Dimulai";
        const body = t.filename || "Starting download...";
        spawn("notify-send", ["-i", "downnux", "-a", "DownNux Manager", title, body], {
          stdio: "ignore",
          detached: true,
          env: {
            ...process.env,
            DISPLAY: process.env.DISPLAY || ":0",
            WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "wayland-0",
          },
        }).unref();
      } catch {}
    }
    this.emitTask(t);
    this.schedule();
    return this.toPublic(t);
  }

  async pause(id: string): Promise<Task> {
    const t = this.mustGet(id);
    if (t.status === "paused") return this.toPublic(t);
    if (isFinal(t.status)) throw new ManagerError("INVALID_STATE", `Tidak bisa jeda download berstatus ${t.status}`);
    await this.releaseJob(t);
    this.setStatus(t, "paused");
    this.schedule();
    return this.toPublic(t);
  }

  resume(id: string): Task {
    const t = this.mustGet(id);
    if (t.status !== "paused" && t.status !== "failed") {
      if (t.status === "queued" || t.status === "downloading" || t.status === "retrying") return this.toPublic(t);
      throw new ManagerError("INVALID_STATE", `Tidak bisa melanjutkan download berstatus ${t.status}`);
    }
    t.retryCount = 0;
    t.error = null;
    this.restartCounts.delete(t.id);
    this.setStatus(t, "queued");
    this.schedule();
    return this.toPublic(t);
  }

  /** Satu-satunya aksi pengguna yang menghentikan download secara permanen (PRD 6.2). */
  async cancel(id: string, keepPartial = false): Promise<Task> {
    const t = this.mustGet(id);
    if (t.status === "canceled") return this.toPublic(t);
    if (t.status === "completed") throw new ManagerError("INVALID_STATE", "Download sudah selesai; gunakan hapus.");
    await this.releaseJob(t);
    if (!keepPartial) this.deletePartial(t);
    this.setStatus(t, "canceled");
    log.info(`Batal ${t.id} (keepPartial=${keepPartial})`);
    this.schedule();
    return this.toPublic(t);
  }

  async remove(id: string, deleteFile = false): Promise<void> {
    const t = this.mustGet(id);
    if (!isFinal(t.status)) {
      await this.releaseJob(t);
      this.deletePartial(t);
    }
    if (deleteFile) {
      const p = safeJoin(t.dir, t.filename);
      if (p) unlinkQuiet(p);
      this.deletePartial(t);
    }
    this.tasks.delete(id);
    this.rt.delete(id);
    this.store.delete(id);
    this.emit("removed", id);
    this.schedule();
  }

  async pauseAll(): Promise<number> {
    let n = 0;
    for (const t of [...this.tasks.values()]) {
      if (t.status === "queued" || t.status === "downloading" || t.status === "retrying") {
        await this.pause(t.id);
        n++;
      }
    }
    return n;
  }

  resumeAll(): number {
    let n = 0;
    for (const t of this.tasks.values()) {
      if (t.status === "paused") {
        this.resume(t.id);
        n++;
      }
    }
    return n;
  }

  openFolder(id: string): { ok: true } {
    const t = this.mustGet(id);
    const targetDir = t.dir || path.join(process.env.HOME || "", "Downloads");
    const targetFile = t.filename ? path.join(targetDir, t.filename) : "";

    const env = { ...process.env };
    if (!env.DISPLAY) env.DISPLAY = ":0";

    try {
      if (targetFile && fs.existsSync(targetFile)) {
        // Try revealing file in file manager
        const child = spawn("nautilus", ["--select", targetFile], {
          detached: true,
          stdio: "ignore",
          env,
        });
        child.on("error", () => {
          spawn("xdg-open", [targetDir], { detached: true, stdio: "ignore", env }).unref();
        });
        child.unref();
      } else {
        spawn("xdg-open", [targetDir], { detached: true, stdio: "ignore", env }).unref();
      }
    } catch {
      try {
        spawn("xdg-open", [targetDir], { detached: true, stdio: "ignore", env }).unref();
      } catch (err) {
        log.warn(`Gagal membuka folder untuk task ${id}:`, err);
      }
    }
    return { ok: true };
  }

  openFile(id: string): { ok: true } {
    const t = this.mustGet(id);
    const targetDir = t.dir || path.join(process.env.HOME || "", "Downloads");
    const targetFile = t.filename ? path.join(targetDir, t.filename) : "";
    const env = {
      ...process.env,
      DISPLAY: process.env.DISPLAY || ":0",
      WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "wayland-0",
    };
    if (targetFile && fs.existsSync(targetFile)) {
      spawn("xdg-open", [targetFile], {
        detached: true,
        stdio: "ignore",
        env,
      }).unref();
    } else {
      spawn("xdg-open", [targetDir], {
        detached: true,
        stdio: "ignore",
        env,
      }).unref();
    }
    return { ok: true };
  }

  async repair(id: string): Promise<Task> {
    const t = this.mustGet(id);
    await this.releaseJob(t);
    this.deletePartial(t);
    const p = safeJoin(t.dir, t.filename);
    if (p) unlinkQuiet(p);
    t.completedBytes = 0;
    t.error = null;
    t.connections = t.connections || 8;
    this.rt.set(t.id, emptyRuntime());
    this.setStatus(t, "queued");
    this.store.upsert(t);
    this.emit("task", this.toPublic(t));
    this.schedule();
    log.info(`Repair / Restart task ${t.id} (${t.filename})`);
    return this.toPublic(t);
  }

  private notifyCompletion(t: StoredTask): void {
    const s = this.settings.get();
    if (s.notifyOnComplete) {
      try {
        const title = s.language === "en" ? "DownNux Manager · Download Completed" : "DownNux Manager · Unduhan Selesai";
        const body = t.filename || "File";
        spawn("notify-send", ["-i", "downnux", "-a", "DownNux Manager", title, body], {
          stdio: "ignore",
          detached: true,
          env: {
            ...process.env,
            DISPLAY: process.env.DISPLAY || ":0",
            WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "wayland-0",
          },
        }).unref();
      } catch (err) {
        log.warn("Gagal mengirim notifikasi desktop:", err);
      }
    }

    if (s.onCompleteAction === "openFolder") {
      this.openFolder(t.id);
    } else if (s.onCompleteAction === "openFile") {
      const targetDir = t.dir || path.join(process.env.HOME || "", "Downloads");
      const targetFile = t.filename ? path.join(targetDir, t.filename) : "";
      if (targetFile && fs.existsSync(targetFile)) {
        spawn("xdg-open", [targetFile], {
          stdio: "ignore",
          detached: true,
          env: {
            ...process.env,
            DISPLAY: process.env.DISPLAY || ":0",
            WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "wayland-0",
          },
        }).unref();
      }
    }
  }

  // ---------------------------------------------------------------------------

  private mustGet(id: string): StoredTask {
    const t = this.tasks.get(id);
    if (!t) throw new ManagerError("NOT_FOUND", `Download ${id} tidak ditemukan`);
    return t;
  }

  private runtime(id: string): Runtime {
    let r = this.rt.get(id);
    if (!r) {
      r = emptyRuntime();
      this.rt.set(id, r);
    }
    return r;
  }

  /** Mulai download yang menunggu, sesuai batas download bersamaan. */
  private schedule(): void {
    const max = this.settings.get().maxConcurrent;
    let running = 0;
    for (const t of this.tasks.values()) {
      if (this.runtime(t.id).jobId) running++;
    }
    if (running >= max) return;
    const queued = [...this.tasks.values()]
      .filter((t) => t.status === "queued" && !this.runtime(t.id).jobId)
      .sort((a, b) => a.createdAt - b.createdAt);
    for (const t of queued) {
      if (running >= max) break;
      running++;
      void this.startJob(t);
    }
  }

  private async startJob(t: StoredTask): Promise<void> {
    const r = this.runtime(t.id);
    r.nextRetryAt = null;
    // Tandai segera agar schedule() tidak memulai task yang sama dua kali.
    r.jobId = "pending";
    this.setStatus(t, "downloading");
    try {
      const jobId = await this.engine.add({
        url: t.url,
        dir: t.dir,
        filename: t.filename || undefined,
        connections: t.connections,
        headers: t.headers ?? undefined,
        torrentBase64: r.torrentBase64,
      });
      // Pengguna bisa saja menjeda/membatalkan selama addUri berjalan.
      if (t.status !== "downloading" || !this.tasks.has(t.id)) {
        await this.engine.stopJob(jobId);
        r.jobId = null;
        return;
      }
      r.jobId = jobId;
      try {
        const statuses = await this.engine.statusMany([jobId]);
        const s = statuses.get(jobId);
        if (s?.path && (!t.filename || t.filename === "video.mp4" || t.filename === "audio.mp3" || !t.filename.includes("."))) {
          t.filename = path.basename(s.path);
          this.store.upsert(t);
          this.emitTask(t);
        }
      } catch {}
    } catch (err) {
      r.jobId = null;
      log.warn(`Gagal memulai ${t.id}`, err);
      this.handleJobError(t, { code: "engine", message: (err as Error).message, kind: "transient" });
    }
  }

  /** Lepaskan job engine dan timer retry, simpan file parsial. */
  private async releaseJob(t: StoredTask): Promise<void> {
    const r = this.runtime(t.id);
    if (r.retryTimer) clearTimeout(r.retryTimer);
    r.retryTimer = null;
    r.nextRetryAt = null;
    const jobId = r.jobId;
    r.jobId = null;
    r.speed = 0;
    r.activeConnections = 0;
    if (jobId && jobId !== "pending") await this.engine.stopJob(jobId);
  }

  private deletePartial(t: StoredTask): void {
    const p = safeJoin(t.dir, t.filename);
    if (!p) return;
    unlinkQuiet(p);
    unlinkQuiet(`${p}.aria2`);
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    this.tickCount++;
    const persist = this.tickCount % PERSIST_EVERY_TICKS === 0;
    try {
      const pairs: [StoredTask, string][] = [];
      for (const t of this.tasks.values()) {
        const j = this.runtime(t.id).jobId;
        if (j && j !== "pending") pairs.push([t, j]);
      }
      if (pairs.length > 0) {
        const statuses = await this.engine.statusMany(pairs.map(([, j]) => j));
        for (const [t, jobId] of pairs) {
          // Abaikan jika job sudah berubah selama request (mis. pengguna menekan pause).
          if (this.runtime(t.id).jobId !== jobId) continue;
          this.applyStatus(t, statuses.get(jobId) ?? null);
        }
      }
      if (persist) {
        for (const t of this.tasks.values()) {
          const r = this.runtime(t.id);
          if (r.dirty) {
            this.store.upsert(t);
            r.dirty = false;
          }
        }
      }
    } catch (err) {
      log.warn("tick gagal", err);
    } finally {
      this.ticking = false;
    }
  }

  private applyStatus(t: StoredTask, s: JobStatus | null): void {
    const r = this.runtime(t.id);
    if (!s) {
      // Engine tidak mengenal job ini lagi: mulai ulang (resume dari file kontrol).
      r.jobId = null;
      this.setStatus(t, "queued");
      this.schedule();
      return;
    }
    if (s.path && (!t.filename || t.filename === "video.mp4" || t.filename === "audio.mp3" || !t.filename.includes("."))) {
      t.filename = path.basename(s.path);
      this.store.upsert(t);
    }
    if (s.totalBytes > 0) t.totalBytes = s.totalBytes;
    if (s.completedBytes > t.completedBytes && t.retryCount > 0) {
      // Ada kemajuan lagi: koneksi pulih.
      t.retryCount = 0;
    }
    t.completedBytes = s.completedBytes;
    r.speed = s.speed;
    r.activeConnections = s.connections;
    r.dirty = true;

    // Real-time speed history for sparkline chart
    const history = r.speedHistory || [];
    history.push(s.speed);
    if (history.length > 40) history.shift();
    r.speedHistory = history;

    // BitTorrent & Segment tracking
    r.isTorrent = s.isTorrent || t.url.startsWith("magnet:?") || t.url.endsWith(".torrent");
    if (s.uploadSpeed !== undefined) r.uploadSpeed = s.uploadSpeed;
    if (s.uploadBytes !== undefined) r.uploadBytes = s.uploadBytes;
    if (s.numSeeders !== undefined) r.numSeeders = s.numSeeders;
    if (s.pieceLength !== undefined) r.pieceLength = s.pieceLength;
    if (s.numPieces !== undefined) r.numPieces = s.numPieces;
    if (s.bitfield !== undefined) r.bitfield = s.bitfield;

    // Magnet links: transition from metadata GID to payload GID
    if (s.followedBy && s.followedBy[0] && (s.state === "complete" || s.state === "active")) {
      log.info(`Magnet link metadata downloaded for ${t.id}, transitioning to payload GID ${s.followedBy[0]}`);
      r.jobId = s.followedBy[0];
      return;
    }

    switch (s.state) {
      case "active":
      case "waiting":
        if (t.status !== "downloading") this.setStatus(t, "downloading");
        else {
          t.updatedAt = Date.now();
          this.emitTask(t);
        }
        return;
      case "complete":
        r.jobId = null;
        r.speed = 0;
        r.activeConnections = 0;
        t.completedAt = Date.now();
        t.error = null;
        if (t.totalBytes > 0) t.completedBytes = t.totalBytes;
        this.restartCounts.delete(t.id);
        this.setStatus(t, "completed");
        log.info(`Selesai ${t.id} ${t.filename}`);
        this.notifyCompletion(t);
        this.schedule();
        return;
      case "error":
        r.jobId = null;
        this.handleJobError(t, s.error ?? { code: "unknown", message: "Error tidak dikenal", kind: "limited" });
        return;
      case "paused":
      case "removed":
        // Bukan dari kita (kita selalu melepas job lewat releaseJob). Mulai lagi.
        r.jobId = null;
        this.setStatus(t, "queued");
        this.schedule();
        return;
    }
  }

  private handleJobError(t: StoredTask, e: JobError): void {
    const r = this.runtime(t.id);
    r.speed = 0;
    r.activeConnections = 0;
    log.warn(`Error ${t.id} [${e.kind}] ${e.code}: ${e.message}`);

    if (e.kind === "fatal") {
      t.error = { code: e.code, message: e.message };
      this.setStatus(t, "failed");
      this.schedule();
      return;
    }
    if (e.kind === "restart") {
      const n = (this.restartCounts.get(t.id) ?? 0) + 1;
      this.restartCounts.set(t.id, n);
      if (n > RESTART_MAX) {
        t.error = { code: e.code, message: `${e.message} (gagal memulai ulang ${RESTART_MAX}x)` };
        this.setStatus(t, "failed");
        this.schedule();
        return;
      }
      // Server tidak mendukung resume: mulai dari nol.
      this.deletePartial(t);
      t.completedBytes = 0;
      this.setStatus(t, "queued");
      this.schedule();
      return;
    }

    t.retryCount++;
    if (e.kind === "limited" && t.retryCount > LIMITED_RETRY_MAX) {
      t.error = { code: e.code, message: e.message };
      this.setStatus(t, "failed");
      this.schedule();
      return;
    }
    const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.min(t.retryCount - 1, 10));
    const jitter = Math.floor(Math.random() * 500);
    r.nextRetryAt = Date.now() + delay + jitter;
    t.error = { code: e.code, message: e.message };
    this.setStatus(t, "retrying");
    r.retryTimer = setTimeout(() => {
      r.retryTimer = null;
      if (t.status !== "retrying" || !this.tasks.has(t.id)) return;
      this.setStatus(t, "queued");
      this.schedule();
    }, delay + jitter);
    this.schedule();
  }

  private onEngineRestarted(): void {
    log.warn("Engine dinyalakan ulang; memulai ulang download aktif.");
    for (const t of this.tasks.values()) {
      const r = this.runtime(t.id);
      if (r.jobId) {
        r.jobId = null;
        this.setStatus(t, "queued");
      }
    }
    void this.engine.setGlobalSpeedLimit(this.settings.get().globalSpeedLimit).catch(() => {});
    this.schedule();
  }

  private setStatus(t: StoredTask, status: StoredTask["status"]): void {
    if (status !== "downloading" && status !== "retrying") {
      const r = this.runtime(t.id);
      r.speed = 0;
      r.activeConnections = 0;
    }
    t.status = status;
    t.updatedAt = Date.now();
    this.store.upsert(t);
    this.runtime(t.id).dirty = false;
    this.emitTask(t);
  }

  private toPublic(t: StoredTask): Task {
    const r = this.runtime(t.id);
    return toPublicTask(t, {
      speed: r.speed,
      activeConnections: r.activeConnections,
      nextRetryAt: r.nextRetryAt,
      isTorrent: r.isTorrent,
      uploadSpeed: r.uploadSpeed,
      uploadBytes: r.uploadBytes,
      numSeeders: r.numSeeders,
      pieceLength: r.pieceLength,
      numPieces: r.numPieces,
      bitfield: r.bitfield,
      speedHistory: r.speedHistory,
    });
  }

  private emitTask(t: StoredTask): void {
    this.emit("task", this.toPublic(t));
  }

  /** Dipanggil setelah pengaturan berubah. */
  onSettingsChanged(): void {
    const s = this.settings.get();
    const limit = s.speedLimiterEnabled ? (s.speedLimitBytesPerSec || s.globalSpeedLimit) : 0;
    void this.engine.setGlobalSpeedLimit(limit).catch(() => {});
    this.schedule();
  }
}

function emptyRuntime(): Runtime {
  return { jobId: null, speed: 0, activeConnections: 0, nextRetryAt: null, retryTimer: null, dirty: false };
}

function isFinal(s: StoredTask["status"]): boolean {
  return s === "completed" || s === "failed" || s === "canceled";
}

