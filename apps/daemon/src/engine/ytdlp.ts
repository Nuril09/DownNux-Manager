import { spawn, execFile, execFileSync, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import type { DownloadEngine, EngineEvents, JobSpec, JobStatus, JobError } from "./types.ts";
import {
  isSpotifyUrl,
  resolveSpotifyUrl,
  findBestYoutubeUrlForSpotify,
  type SpotifyTrackMetadata,
} from "./spotify.ts";
import { logger } from "../log.ts";

const execFileAsync = promisify(execFile);
const log = logger("ytdlp");

export function isAudioOnlySite(url: string): boolean {
  return isSpotifyUrl(url) || /soundcloud\.com|bandcamp\.com/i.test(url);
}

export function isMediaSite(url: string): boolean {
  return (
    isAudioOnlySite(url) ||
    /youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|twitter\.com|x\.com|instagram\.com|twitch\.tv|dailymotion\.com|reddit\.com|facebook\.com/i.test(url)
  );
}

async function tagMp3WithSpotifyMetadata(
  ffmpegBin: string,
  mp3Path: string,
  track: SpotifyTrackMetadata,
): Promise<void> {
  const dir = path.dirname(mp3Path);
  const tmpOut = path.join(dir, `.downnux-tag-${crypto.randomUUID()}.mp3`);
  let coverPath: string | null = null;

  try {
    if (track.coverUrl) {
      try {
        const res = await fetch(track.coverUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 0 && buf.length < 5 * 1024 * 1024) {
            coverPath = path.join(dir, `.downnux-cover-${crypto.randomUUID()}.jpg`);
            fs.writeFileSync(coverPath, buf);
          }
        }
      } catch {
        coverPath = null;
      }
    }

    const args: string[] = ["-y", "-i", mp3Path];
    if (coverPath) {
      args.push("-i", coverPath, "-map", "0:a", "-map", "1:v", "-c:a", "copy", "-c:v", "copy", "-disposition:v:0", "attached_pic");
    } else {
      args.push("-c", "copy");
    }

    args.push("-id3v2_version", "3", "-metadata", `title=${track.title}`);
    if (track.artists.length > 0) {
      args.push("-metadata", `artist=${track.artists.join(", ")}`);
    }
    if (track.releaseYear) {
      args.push("-metadata", `date=${track.releaseYear}`);
    }
    args.push("-metadata", `comment=Matched via Spotify (${track.canonicalUrl})`, tmpOut);

    await execFileAsync(ffmpegBin, args, { timeout: 15_000, windowsHide: true });
    if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
      fs.renameSync(tmpOut, mp3Path);
    }
  } catch (err) {
    log.warn("Gagal menyematkan metadata ID3 Spotify, mempertahankan file MP3 asli:", err);
  } finally {
    try {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    } catch {}
    try {
      if (coverPath && fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    } catch {}
  }
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
    const isWin = process.platform === "win32";
    const ytdlpExe = isWin ? "yt-dlp.exe" : "yt-dlp";
    const ffmpegExe = isWin ? "ffmpeg.exe" : "ffmpeg";
    const binDir = process.env.DOWNNUX_BIN_DIR;
    const home = os.homedir();

    const ytdlpCandidates = [
      binDir ? path.join(binDir, ytdlpExe) : undefined,
      path.join(path.dirname(process.execPath), "bin", ytdlpExe),
      path.join(path.dirname(process.execPath), ytdlpExe),
      path.join(process.cwd(), "bin", ytdlpExe),
      path.join(home, ".local/bin", ytdlpExe),
      "/usr/local/bin/yt-dlp",
      "/usr/bin/yt-dlp",
      "/opt/homebrew/bin/yt-dlp",
      ...(process.env.PATH ?? "").split(path.delimiter).map((d) => d && path.join(d, ytdlpExe)),
    ];
    for (const c of ytdlpCandidates) {
      if (c && fs.existsSync(c)) {
        this.binaryPath = c;
        break;
      }
    }
    if (!this.binaryPath) this.binaryPath = ytdlpExe;

    const ffmpegCandidates = [
      binDir ? path.join(binDir, ffmpegExe) : undefined,
      path.join(path.dirname(process.execPath), "bin", ffmpegExe),
      path.join(path.dirname(process.execPath), ffmpegExe),
      path.join(process.cwd(), "bin", ffmpegExe),
      path.join(home, ".local/bin", ffmpegExe),
      "/usr/bin/ffmpeg",
      "/usr/local/bin/ffmpeg",
      "/opt/homebrew/bin/ffmpeg",
      ...(process.env.PATH ?? "").split(path.delimiter).map((d) => d && path.join(d, ffmpegExe)),
    ];
    for (const c of ffmpegCandidates) {
      if (c && fs.existsSync(c)) {
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

    let spotifyTrack: SpotifyTrackMetadata | null = null;
    let downloadTargetUrl = spec.url;

    if (isSpotifyUrl(spec.url)) {
      const resolved = await resolveSpotifyUrl(spec.url);
      if (!resolved.supported) {
        throw Object.assign(new Error(resolved.reason), { kind: "fatal" as const });
      }
      spotifyTrack = resolved.track;
      downloadTargetUrl = await findBestYoutubeUrlForSpotify(this.binaryPath, spotifyTrack);
    }

    const isAudioOnly =
      Boolean(spotifyTrack) ||
      isAudioOnlySite(spec.url) ||
      spec.headers?.format === "audio" ||
      Boolean(spec.filename && /\.(mp3|m4a|flac|wav|ogg|opus)$/i.test(spec.filename));
    const videoQuality = spec.headers?.videoQuality || "best";
    const audioQuality = spec.headers?.audioQuality || "320";

    // 1. Resolve output filename
    let resolvedFilename = spec.filename || "";
    if (!resolvedFilename || resolvedFilename === "video.mp4" || resolvedFilename === "audio.mp3") {
      if (spotifyTrack) {
        const cleanTitle = spotifyTrack.displayName.replace(/[\/\\?%*:|"<>]/g, "_").trim();
        resolvedFilename = `${cleanTitle}.mp3`;
      } else {
        try {
          const titleRes = execFileSync(this.binaryPath, [
            "--js-runtimes", `node:${process.execPath}`,
            "--print", "%(title)s",
            "--no-playlist",
            downloadTargetUrl,
          ], { encoding: "utf8", timeout: 8000, windowsHide: true }).trim();
          if (titleRes) {
            const cleanTitle = titleRes.replace(/[\/\\?%*:|"<>]/g, "_").trim();
            resolvedFilename = `${cleanTitle}.${isAudioOnly ? "mp3" : "mp4"}`;
          }
        } catch (err) {
          log.warn("Could not pre-fetch yt-dlp filename:", err);
        }
      }
    } else if (isAudioOnly && !/\.(mp3|m4a|flac|wav|ogg|opus)$/i.test(resolvedFilename)) {
      resolvedFilename = `${resolvedFilename.replace(/\.mp4$/i, "")}.mp3`;
    }

    try {
      fs.mkdirSync(spec.dir, { recursive: true });
    } catch {}

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
      "--js-runtimes", `node:${process.execPath}`,
      "--newline",
      "--progress-template", "P:%(progress.downloaded_bytes)s/%(progress.total_bytes)s:%(progress.speed)s",
      "-P", spec.dir,
      "--no-playlist",
    ];

    if (this.ffmpegPath) {
      args.push("--ffmpeg-location", this.ffmpegPath);
    }

    if (isAudioOnly) {
      const bitrateArg =
        audioQuality === "192" ? "192K" : audioQuality === "128" ? "128K" : "320K";
      const outputTemplate = resolvedFilename
        ? `${resolvedFilename.replace(/\.(mp3|m4a|flac|wav|ogg|opus)$/i, "")}.%(ext)s`
        : "%(title)s.%(ext)s";
      args.push(
        "-f", "bestaudio/best",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", bitrateArg,
        "--add-metadata",
        "-o", outputTemplate,
      );
    } else {
      let formatSelector = "bv*[vcodec^=avc]+ba[acodec^=mp4a]/bv*[vcodec^=avc]+ba/b[vcodec^=avc]/bv*+ba[acodec^=mp4a]/bv*+ba/b";
      let sortSpec = "vcodec:h264,acodec:m4a,res";

      if (videoQuality === "1080") {
        formatSelector = "bv*[height<=1080][vcodec^=avc]+ba[acodec^=mp4a]/bv*[height<=1080][vcodec^=avc]+ba/b[height<=1080][vcodec^=avc]/bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b";
        sortSpec = "res:1080,vcodec:h264,acodec:m4a";
      } else if (videoQuality === "720") {
        formatSelector = "bv*[height<=720][vcodec^=avc]+ba[acodec^=mp4a]/bv*[height<=720][vcodec^=avc]+ba/b[height<=720][vcodec^=avc]/bv*[height<=720]+ba/b[height<=720]/bv*+ba/b";
        sortSpec = "res:720,vcodec:h264,acodec:m4a";
      } else if (videoQuality === "480") {
        formatSelector = "bv*[height<=480][vcodec^=avc]+ba[acodec^=mp4a]/bv*[height<=480][vcodec^=avc]+ba/b[height<=480][vcodec^=avc]/bv*[height<=480]+ba/b[height<=480]/bv*+ba/b";
        sortSpec = "res:480,vcodec:h264,acodec:m4a";
      }

      // Prioritize H.264 (AVC) and AAC/m4a with fallback recoding for universal compatibility (WhatsApp, Gmail, iOS, Android, web)
      args.push(
        "-f", formatSelector,
        "-S", sortSpec,
        "--merge-output-format", "mp4",
        "--recode-video", "mp4",
        "--postprocessor-args", "Merger:-movflags +faststart",
        "--postprocessor-args", "VideoConvertor:-c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart",
        "-o", resolvedFilename ? resolvedFilename : "%(title)s.%(ext)s"
      );
    }

    args.push(downloadTargetUrl);

    log.info(`Spawning yt-dlp: ${this.binaryPath} ${downloadTargetUrl}`);
    const cp = spawn(this.binaryPath, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    this.processes.set(jobId, cp);

    let stdoutBuffer = "";

    cp.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        // Destination detection
        const extractDest = trimmed.match(/\[(?:ExtractAudio|Merger)\]\s+(?:Destination|Merging formats into):\s*["']?([^"']+)["']?$/i);
        if (extractDest && extractDest[1]) {
          initialStatus.path = extractDest[1].trim();
        } else {
          const destMatch = trimmed.match(/(?:Destination|Merging formats into):\s*["']?([^"']+)["']?$/i);
          if (destMatch && destMatch[1] && (!isAudioOnly || !initialStatus.path)) {
            initialStatus.path = destMatch[1].trim();
          }
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
        void (async () => {
          const finalPath = initialStatus.path || (resolvedFilename ? path.join(spec.dir, resolvedFilename) : "");
          if (spotifyTrack && this.ffmpegPath && finalPath && fs.existsSync(finalPath)) {
            await tagMp3WithSpotifyMetadata(this.ffmpegPath, finalPath, spotifyTrack);
          }
          if (finalPath && fs.existsSync(finalPath)) {
            try {
              const stat = fs.statSync(finalPath);
              if (stat.size > 0) {
                initialStatus.totalBytes = stat.size;
                initialStatus.completedBytes = stat.size;
              }
            } catch {}
          } else if (initialStatus.totalBytes > 0) {
            initialStatus.completedBytes = initialStatus.totalBytes;
          }
          initialStatus.state = "complete";
          initialStatus.speed = 0;
        })();
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
