import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ScheduleConfig, type ScheduleConfigPatch } from "@downnux/shared";
import { logger } from "./log.ts";
import type { DownloadManager } from "./manager.ts";

const log = logger("scheduler");

export class SchedulerStore {
  private current: ScheduleConfig;
  private readonly file: string;

  constructor(configDir: string) {
    this.file = path.join(configDir, "scheduler.json");
    this.current = this.load();
  }

  get(): ScheduleConfig {
    return this.current;
  }

  update(patch: ScheduleConfigPatch): ScheduleConfig {
    const next = ScheduleConfig.parse({ ...this.current, ...patch });
    this.current = next;
    this.save();
    return next;
  }

  private load(): ScheduleConfig {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return ScheduleConfig.parse(raw);
    } catch {
      return ScheduleConfig.parse({});
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.current, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
}

export class SchedulerEngine {
  private timer: NodeJS.Timeout | null = null;
  private hasTriggeredFinish: boolean = false;

  constructor(
    private readonly store: SchedulerStore,
    private readonly manager: DownloadManager,
  ) {
    this.start();
  }

  start(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => void this.tick(), 15000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runNow(): Promise<{ ok: boolean }> {
    await this.processQueue();
    return { ok: true };
  }

  private async tick(): Promise<void> {
    const cfg = this.store.get();
    if (!cfg.enabled) {
      this.hasTriggeredFinish = false;
      return;
    }

    const now = new Date();
    const day = now.getDay();
    if (!cfg.daysOfWeek.includes(day)) return;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = cfg.startTime.split(":").map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);

    let isInWindow = false;
    if (cfg.stopTime) {
      const [stopH, stopM] = cfg.stopTime.split(":").map(Number);
      const stopMinutes = (stopH || 0) * 60 + (stopM || 0);
      if (startMinutes <= stopMinutes) {
        isInWindow = currentMinutes >= startMinutes && currentMinutes < stopMinutes;
      } else {
        // Rentang melewati tengah malam, mis. 23:00 s.d. 06:00
        isInWindow = currentMinutes >= startMinutes || currentMinutes < stopMinutes;
      }
    } else {
      isInWindow = currentMinutes >= startMinutes;
    }

    if (isInWindow) {
      await this.processQueue();
    } else {
      this.hasTriggeredFinish = false;
    }
  }

  private async processQueue(): Promise<void> {
    const cfg = this.store.get();
    const tasks = this.manager.list();
    const downloading = tasks.filter((t) => t.status === "downloading" || t.status === "retrying");
    const pending = tasks.filter((t) => t.status === "queued" || t.status === "paused");

    const slotsAvailable = Math.max(0, cfg.maxSimultaneous - downloading.length);
    if (slotsAvailable > 0 && pending.length > 0) {
      this.hasTriggeredFinish = false;
      for (let i = 0; i < Math.min(slotsAvailable, pending.length); i++) {
        log.info(`Scheduler mengaktifkan unduhan: ${pending[i].filename || pending[i].url}`);
        try {
          this.manager.resume(pending[i].id);
        } catch (err) {
          log.warn(`Scheduler gagal melanjutkan ${pending[i].id}:`, err);
        }
      }
    }

    // Jika antrean selesai semua dan sebelumnya ada download
    if (downloading.length === 0 && pending.length === 0 && tasks.length > 0) {
      if (!this.hasTriggeredFinish) {
        this.hasTriggeredFinish = true;
        await this.handleOnFinish(cfg.onFinishAction);
      }
    }
  }

  private async handleOnFinish(action: "none" | "quit" | "sleep" | "shutdown"): Promise<void> {
    if (action === "none") return;
    log.info(`Semua antrean unduhan selesai. Menjalankan aksi pasca-selesai: ${action}`);
    if (action === "sleep") {
      spawn("systemctl", ["suspend"], { stdio: "ignore", detached: true }).unref();
    } else if (action === "shutdown") {
      spawn("systemctl", ["poweroff"], { stdio: "ignore", detached: true }).unref();
    }
  }
}
