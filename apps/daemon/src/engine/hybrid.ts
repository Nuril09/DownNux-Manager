import { EventEmitter } from "node:events";
import type { DownloadEngine, EngineEvents, JobSpec, JobStatus } from "./types.ts";
import { Aria2Engine } from "./aria2.ts";
import { YtDlpEngine, isMediaSite } from "./ytdlp.ts";

export class HybridEngine extends EventEmitter<EngineEvents> implements DownloadEngine {
  readonly name = "hybrid(aria2+yt-dlp)";
  private aria2: Aria2Engine;
  private ytdlp: YtDlpEngine;
  private jobRoutes = new Map<string, "aria2" | "ytdlp">();

  constructor(aria2: Aria2Engine) {
    super();
    this.aria2 = aria2;
    this.ytdlp = new YtDlpEngine();

    this.aria2.on("restarted", () => {
      this.emit("restarted");
    });
  }

  async start(): Promise<void> {
    await Promise.all([this.aria2.start(), this.ytdlp.start()]);
  }

  async stop(): Promise<void> {
    await Promise.all([this.aria2.stop(), this.ytdlp.stop()]);
  }

  version(): string {
    return `${this.aria2.version()} + yt-dlp`;
  }

  async add(spec: JobSpec): Promise<string> {
    if (isMediaSite(spec.url)) {
      const jobId = await this.ytdlp.add(spec);
      this.jobRoutes.set(jobId, "ytdlp");
      return jobId;
    }
    const jobId = await this.aria2.add(spec);
    this.jobRoutes.set(jobId, "aria2");
    return jobId;
  }

  async stopJob(jobId: string): Promise<void> {
    const route = this.jobRoutes.get(jobId);
    if (route === "ytdlp" || jobId.startsWith("ytdlp-")) {
      await this.ytdlp.stopJob(jobId);
    } else {
      await this.aria2.stopJob(jobId);
    }
  }

  async statusMany(jobIds: string[]): Promise<Map<string, JobStatus | null>> {
    const aria2Ids: string[] = [];
    const ytdlpIds: string[] = [];

    for (const id of jobIds) {
      const route = this.jobRoutes.get(id);
      if (route === "ytdlp" || id.startsWith("ytdlp-")) {
        ytdlpIds.push(id);
      } else {
        aria2Ids.push(id);
      }
    }

    const [aria2Map, ytdlpMap] = await Promise.all([
      aria2Ids.length > 0 ? this.aria2.statusMany(aria2Ids) : Promise.resolve(new Map()),
      ytdlpIds.length > 0 ? this.ytdlp.statusMany(ytdlpIds) : Promise.resolve(new Map()),
    ]);

    const combined = new Map<string, JobStatus | null>();
    for (const [k, v] of aria2Map) combined.set(k, v);
    for (const [k, v] of ytdlpMap) combined.set(k, v);
    return combined;
  }

  async setGlobalSpeedLimit(bytesPerSec: number): Promise<void> {
    await this.aria2.setGlobalSpeedLimit(bytesPerSec);
  }
}
