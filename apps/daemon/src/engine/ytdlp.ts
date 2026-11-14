import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import type { DownloadEngine, EngineEvents, JobSpec, JobStatus, JobError } from "./types.ts";
import { logger } from "../log.ts";

const log = logger("ytdlp");

export function isMediaSite(url: string): boolean {
  return /youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|twitter\.com|x\.com|instagram\.com|twitch\.tv|dailymotion\.com|reddit\.com|facebook\.com/i.test(url);
}

export class YtDlpEngine extends EventEmitter<EngineEvents> implements DownloadEngine {
  readonly name = "yt-dlp";
  private processes = new Map<string, ChildProcess>();
  private statuses = new Map<string, JobStatus>();
  private binaryPath: string = "";
  private ffmpegPath: string = "";

  constructor() {
    super();
    this.resolveBinaries();
  }

  private resolveBinaries(): void {
    const home = process.env.HOME || "";
    const ytdlpCandidates = [
      path.join(home, ".local/bin/yt-dlp"),
      "/usr/local/bin/yt-dlp",
      "/usr/bin/yt-dlp",
    ];
    for (const c of ytdlpCandidates) {
      if (fs.existsSync(c)) {
        this.binaryPath = c;
        break;
      }
    }
    if (!this.binaryPath) this.binaryPath = "yt-dlp";

    const ffmpegCandidates = [
      "/usr/bin/ffmpeg",
      "/usr/local/bin/ffmpeg",
      path.join(home, ".local/bin/ffmpeg"),
    ];
    for (const c of ffmpegCandidates) {
      if (fs.existsSync(c)) {
        this.ffmpegPath = c;
        break;
      }
    }
  }

  async start(): Promise<void> {
    this.resolveBinaries();
  }

  async stop(): Promise<void> {
    for (const [id, cp] of this.processes) {
      try {
        cp.kill("SIGTERM");
      } catch {}
    }
    this.processes.clear();
  }

  version(): string {
    return "yt-dlp";
  }

  async add(spec: JobSpec): Promise<string> {
    const jobId = `ytdlp-${crypto.randomUUID()}`;

    const isAudioOnly = spec.headers?.format === "audio" || (spec.filename && spec.filename.endsWith(".mp3"));

    // 1. Pre-query actual title from yt-dlp
    let resolvedFilename = spec.filename || "";
    if (!resolvedFilename || resolvedFilename === "video.mp4" || resolvedFilename === "audio.mp3") {
      try {
        const titleRes = execFileSync(this.binaryPath, [
          "--js-runtimes", "node:/usr/bin/node",
          "--print", "%(title)s",
          "--no-playlist",
          spec.url,
        ], { encoding: "utf8", timeout: 8000 }).trim();
        if (titleRes) {
          const cleanTitle = titleRes.replace(/[\/\\?%*:|"<>]/g, "_").trim();
          resolvedFilename = `${cleanTitle}.${isAudioOnly ? "mp3" : "mp4"}`;
        }
      } catch (err) {
        log.warn("Could not pre-fetch yt-dlp filename:", err);
      }
    }

    const initialStatus: JobStatus = {
      state: "active",
      totalBytes: 0,
      completedBytes: 0,
      speed: 0,
      connections: 1,
      path: resolvedFilename ? path.join(spec.dir, resolvedFilename) : "",
      error: null,
    };
    this.statuses.set(jobId, initialStatus);

    const args: string[] = [
      "--js-runtimes", "node:/usr/bin/node",
      "--newline",
      "--progress-template", "P:%(progress.downloaded_bytes)s/%(progress.total_bytes)s:%(progress.speed)s",
      "-P", spec.dir,
      "--no-playlist",
    ];

    if (this.ffmpegPath) {
      args.push("--ffmpeg-location", this.ffmpegPath);
    }

    if (isAudioOnly) {
      args.push("-x", "--audio-format", "mp3");
      args.push("-o", resolvedFilename ? resolvedFilename : "%(title)s.%(ext)s");
    } else {
      // Prioritize H.264 (AVC) and AAC/m4a with fallback recoding for universal compatibility (WhatsApp, Gmail, iOS, Android, web)
      args.push(
        "-f", "bv*[vcodec^=avc]+ba[acodec^=mp4a]/bv*[vcodec^=avc]+ba/b[vcodec^=avc]/bv*+ba[acodec^=mp4a]/bv*+ba/b",
        "-S", "vcodec:h264,acodec:m4a,res",
        "--merge-output-format", "mp4",
        "--recode-video", "mp4",
        "--postprocessor-args", "Merger:-movflags +faststart",
        "--postprocessor-args", "VideoConvertor:-c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart",
        "-o", resolvedFilename ? resolvedFilename : "%(title)s.%(ext)s"
      );
    }

    args.push(spec.url);

    log.info(`Spawning yt-dlp: ${this.binaryPath} ${spec.url}`);
    const cp = spawn(this.binaryPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    this.processes.set(jobId, cp);

    let stdoutBuffer = "";

    cp.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        // Destination detection
        const destMatch = trimmed.match(/(?:Destination|Merging formats into):\s*["']?([^"']+)["']?$/i);
        if (destMatch && destMatch[1]) {
          const filePath = destMatch[1].trim();
          initialStatus.path = filePath;
        }

        // Progress line: P:12345/67890:54321
        if (trimmed.startsWith("P:")) {
          const content = trimmed.slice(2);
          const [bytesPart, speedPart] = content.split(":");
          if (bytesPart) {
            const [completedStr, totalStr] = bytesPart.split("/");
            const completed = Number(completedStr);
            const total = Number(totalStr);
            if (!isNaN(completed) && completed > 0) initialStatus.completedBytes = completed;
            if (!isNaN(total) && total > 0) initialStatus.totalBytes = total;
          }
          if (speedPart && speedPart !== "NA") {
            const speed = Number(speedPart);
            if (!isNaN(speed)) initialStatus.speed = speed;
          }
        }
      }
    });

    let stderrBuffer = "";
    cp.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
    });

    cp.on("close", (code) => {
      this.processes.delete(jobId);
      if (code === 0) {
        initialStatus.state = "complete";
        initialStatus.speed = 0;
        if (initialStatus.totalBytes > 0) initialStatus.completedBytes = initialStatus.totalBytes;
      } else {
        initialStatus.state = "error";
        initialStatus.speed = 0;
        initialStatus.error = {
          code: `ytdlp:${code}`,
          message: stderrBuffer.slice(-200).trim() || `yt-dlp exited with code ${code}`,
          kind: "fatal",
        };
      }
    });

    cp.on("error", (err) => {
      this.processes.delete(jobId);
      initialStatus.state = "error";
      initialStatus.error = {
        code: "ytdlp:spawn",
        message: err.message,
        kind: "fatal",
      };
    });

    return jobId;
  }

  async stopJob(jobId: string): Promise<void> {
    const cp = this.processes.get(jobId);
    if (cp) {
      try {
        cp.kill("SIGTERM");
      } catch {}
      this.processes.delete(jobId);
    }
    const st = this.statuses.get(jobId);
    if (st && st.state === "active") {
      st.state = "paused";
      st.speed = 0;
    }
  }

  async statusMany(jobIds: string[]): Promise<Map<string, JobStatus | null>> {
    const out = new Map<string, JobStatus | null>();
    for (const id of jobIds) {
      out.set(id, this.statuses.get(id) || null);
    }
    return out;
  }

  async setGlobalSpeedLimit(_bytesPerSec: number): Promise<void> {
    // Speed limit is handled per-process if specified
  }
}
