import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { type MediaSizeEstimates, type UrlProbeResult } from "@downnux/shared";
import { isAudioOnlySite, isMediaSite } from "./engine/ytdlp.ts";
import { formatDuration, isSpotifyUrl, resolveSpotifyUrl } from "./engine/spotify.ts";
import { logger } from "./log.ts";

const execFileAsync = promisify(execFile);
const log = logger("probe");

interface YtDlpFormat {
  format_id?: string | null;
  ext?: string | null;
  height?: number | null;
  width?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  tbr?: number | null;
  vbr?: number | null;
  abr?: number | null;
}

interface YtDlpJsonInfo {
  title?: string | null;
  duration?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  formats?: YtDlpFormat[] | null;
  entries?: YtDlpJsonInfo[] | null;
}

function estimateFormatBytes(fmt: YtDlpFormat, duration: number): number {
  if (fmt.filesize && fmt.filesize > 0) return fmt.filesize;
  if (fmt.filesize_approx && fmt.filesize_approx > 0) return fmt.filesize_approx;
  const bitrateKbps = fmt.tbr || ((fmt.vbr || 0) + (fmt.abr || 0));
  if (bitrateKbps > 0 && duration > 0) {
    return Math.round(((bitrateKbps * 1000) / 8) * duration);
  }
  return 0;
}

function hasExplicitSize(fmt: YtDlpFormat): number {
  return (fmt.filesize && fmt.filesize > 0) || (fmt.filesize_approx && fmt.filesize_approx > 0) ? 1 : 0;
}

function pickBestAudioBytes(formats: YtDlpFormat[], duration: number): number {
  const audioOnly = formats.filter(
    (f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none",
  );
  if (audioOnly.length === 0) return 0;

  audioOnly.sort((a, b) => {
    const aMp4a = a.acodec?.startsWith("mp4a") ? 1 : 0;
    const bMp4a = b.acodec?.startsWith("mp4a") ? 1 : 0;
    if (bMp4a !== aMp4a) return bMp4a - aMp4a;

    const aNonDrc = a.format_id?.includes("-drc") ? 0 : 1;
    const bNonDrc = b.format_id?.includes("-drc") ? 0 : 1;
    if (bNonDrc !== aNonDrc) return bNonDrc - aNonDrc;

    const sizeDiff = estimateFormatBytes(b, duration) - estimateFormatBytes(a, duration);
    if (sizeDiff !== 0) return sizeDiff;

    return (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0);
  });

  return estimateFormatBytes(audioOnly[0]!, duration);
}

function pickVideoBytes(
  formats: YtDlpFormat[],
  duration: number,
  bestAudioBytes: number,
  maxHeight?: number,
): number {
  const videoFormats = formats.filter(
    (f) =>
      f.vcodec &&
      f.vcodec !== "none" &&
      f.vcodec !== "images" &&
      f.ext !== "mhtml" &&
      ((f.height ?? 0) > 0 || (f.width ?? 0) > 0),
  );
  if (videoFormats.length === 0) return 0;

  let pool = videoFormats;
  if (maxHeight) {
    const withinCap = videoFormats.filter((f) => (f.height ?? 0) > 0 && (f.height ?? 0) <= maxHeight);
    if (withinCap.length > 0) {
      pool = withinCap;
    }
  }

  const avcPool = pool.filter((f) => f.vcodec?.startsWith("avc"));
  const candidates = avcPool.length > 0 ? avcPool : pool;

  candidates.sort((a, b) => {
    const heightDiff = (b.height ?? 0) - (a.height ?? 0);
    if (heightDiff !== 0) return heightDiff;

    const sizeFlagDiff = hasExplicitSize(b) - hasExplicitSize(a);
    if (sizeFlagDiff !== 0) return sizeFlagDiff;

    return estimateFormatBytes(b, duration) - estimateFormatBytes(a, duration);
  });

  const chosen = candidates[0]!;
  const videoBytes = estimateFormatBytes(chosen, duration);
  if (videoBytes <= 0) return 0;

  const needsAudioMerge = !chosen.acodec || chosen.acodec === "none";
  return needsAudioMerge ? videoBytes + bestAudioBytes : videoBytes;
}

function computeMediaSizes(info: YtDlpJsonInfo): { duration: number; mediaSizes: MediaSizeEstimates; defaultSize: number } {
  const duration = Number(info.duration) > 0 ? Number(info.duration) : 0;
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const bestAudioBytes = pickBestAudioBytes(formats, duration);
  const fallbackBytes = Number(info.filesize || info.filesize_approx || 0);

  const videoBest = pickVideoBytes(formats, duration, bestAudioBytes) || fallbackBytes;
  const video1080 = pickVideoBytes(formats, duration, bestAudioBytes, 1080) || videoBest;
  const video720 = pickVideoBytes(formats, duration, bestAudioBytes, 720) || videoBest;
  const video480 = pickVideoBytes(formats, duration, bestAudioBytes, 480) || videoBest;

  const estimateMp3 = (kbps: number): number => {
    if (duration > 0) {
      return Math.round(((kbps * 1000) / 8) * duration);
    }
    return bestAudioBytes || fallbackBytes;
  };

  return {
    duration,
    defaultSize: videoBest,
    mediaSizes: {
      video: {
        best: videoBest,
        "1080": video1080,
        "720": video720,
        "480": video480,
      },
      audio: {
        "320": estimateMp3(320),
        "192": estimateMp3(192),
        "128": estimateMp3(128),
      },
    },
  };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(1)} ${units[idx]}`.replace(".0 ", " ");
}

function detectCategory(filename: string, contentType: string = ""): "video" | "music" | "documents" | "compressed" | "programs" | "all" {
  const ext = path.extname(filename).toLowerCase().replace(/^\./, "");
  const ct = contentType.toLowerCase();

  if (ct.startsWith("video/") || ["mp4", "mkv", "webm", "avi", "mov", "flv", "ts", "m4v"].includes(ext)) {
    return "video";
  }
  if (ct.startsWith("audio/") || ["mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "wma"].includes(ext)) {
    return "music";
  }
  if (["pdf", "doc", "docx", "epub", "txt", "odt", "rtf", "ppt", "pptx", "xls", "xlsx"].includes(ext) || ct.includes("pdf") || ct.includes("document") || ct.includes("sheet")) {
    return "documents";
  }
  if (["zip", "tar", "gz", "7z", "rar", "bz2", "xz", "tgz"].includes(ext) || ct.includes("zip") || ct.includes("compressed") || ct.includes("tar")) {
    return "compressed";
  }
  if (["deb", "rpm", "exe", "msi", "iso", "appimage", "apk", "dmg", "pkg"].includes(ext)) {
    return "programs";
  }
  return "all";
}

function parseFilenameFromHeader(header: string | null): string | null {
  if (!header) return null;
  // RFC 5987 / RFC 6266
  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;\s]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {}
  }
  const match = header.match(/filename\s*=\s*(?:"([^"]+)"|'([^']+)'|([^;\s]+))/i);
  if (match) {
    return match[1] || match[2] || match[3] || null;
  }
  return null;
}

export async function probeUrl(
  url: string,
  baseDownloadDir: string,
  customHeaders?: Record<string, string>,
  categoryDirs?: Record<string, string>,
): Promise<UrlProbeResult> {
  // 0. Magnet Link Probe
  if (url.startsWith("magnet:?")) {
    const dnMatch = url.match(/[?&]dn=([^&]+)/i);
    const xtMatch = url.match(/[?&]xt=urn:btih:([^&]+)/i);
    const dnStr = dnMatch?.[1];
    const xtStr = xtMatch?.[1];
    const name = dnStr
      ? decodeURIComponent(dnStr.replace(/\+/g, " "))
      : xtStr
        ? `torrent-${xtStr.slice(0, 8)}`
        : "torrent-download";

    return {
      url,
      filename: name,
      size: 0,
      formattedSize: "P2P Swarm",
      resumeSupported: true,
      category: "compressed",
      contentType: "application/x-bittorrent",
      isMedia: false,
      defaultDir: baseDownloadDir,
    };
  }

  // 0.5 Spotify Track / Episode Metadata Probe (matches audio via YouTube)
  if (isSpotifyUrl(url)) {
    const customMusicDir = categoryDirs?.music;
    const musicDir = customMusicDir && customMusicDir.trim() ? customMusicDir : path.join(baseDownloadDir, "Music");

    try {
      const resolved = await resolveSpotifyUrl(url);
      if (!resolved.supported) {
        return {
          url,
          filename: resolved.collection.name
            ? `${resolved.collection.name.replace(/[\/\\?%*:|"<>]/g, "_").trim()}.mp3`
            : "spotify-audio.mp3",
          size: 0,
          formattedSize: "Playlist / Album",
          resumeSupported: false,
          category: "music",
          contentType: "audio/mpeg",
          isMedia: true,
          audioOnly: true,
          sourceHint: "Spotify Collection",
          warning: resolved.reason,
          defaultDir: musicDir,
        };
      }

      const track = resolved.track;
      const cleanName = track.displayName.replace(/[\/\\?%*:|"<>]/g, "_").trim();
      const durationSec = track.durationMs > 0 ? Math.round(track.durationMs / 1000) : 0;
      const durationStr = formatDuration(track.durationMs);
      const estMp3 = (kbps: number) => (durationSec > 0 ? Math.round(((kbps * 1000) / 8) * durationSec) : 0);
      const est320 = estMp3(320);
      const formattedSize = durationStr
        ? `${durationStr}${est320 > 0 ? ` (~${formatBytes(est320)})` : ""}`
        : "Spotify Audio";

      return {
        url,
        filename: `${cleanName}.mp3`,
        size: est320,
        formattedSize,
        resumeSupported: true,
        category: "music",
        contentType: "audio/mpeg",
        isMedia: true,
        audioOnly: true,
        sourceHint: "Spotify Metadata -> YouTube Audio (MP3)",
        defaultDir: musicDir,
        audioDefaultDir: musicDir,
        duration: durationSec || undefined,
        mediaSizes: durationSec > 0
          ? {
              audio: {
                "320": est320,
                "192": estMp3(192),
                "128": estMp3(128),
              },
            }
          : undefined,
      };
    } catch (err) {
      log.warn("Spotify probe error:", err);
      return {
        url,
        filename: "spotify-audio.mp3",
        size: 0,
        formattedSize: "Spotify Audio",
        resumeSupported: true,
        category: "music",
        contentType: "audio/mpeg",
        isMedia: true,
        audioOnly: true,
        warning: (err as Error).message,
        defaultDir: musicDir,
      };
    }
  }

  const isMedia = isMediaSite(url);
  const audioOnly = isAudioOnlySite(url);

  // 1. YouTube / Social Video & Audio Probe via yt-dlp
  if (isMedia) {
    const isWin = process.platform === "win32";
    const ytdlpExe = isWin ? "yt-dlp.exe" : "yt-dlp";
    const binDir = process.env.DOWNNUX_BIN_DIR;
    const home = os.homedir();
    const candidatePaths = [
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
    let ytDlpPath = ytdlpExe;
    for (const c of candidatePaths) {
      if (c && fs.existsSync(c)) {
        ytDlpPath = c;
        break;
      }
    }

    const customVideoDir = categoryDirs?.video;
    const customMusicDir = categoryDirs?.music;
    const audioDefaultDir = customMusicDir && customMusicDir.trim() ? customMusicDir : path.join(baseDownloadDir, "Music");
    const targetDir = audioOnly
      ? audioDefaultDir
      : (customVideoDir && customVideoDir.trim() ? customVideoDir : path.join(baseDownloadDir, "Video"));

    try {
      const { stdout } = await execFileAsync(
        ytDlpPath,
        [
          "--js-runtimes", `node:${process.execPath}`,
          "-J",
          "--no-playlist",
          "--no-warnings",
          url,
        ],
        { encoding: "utf8", timeout: 15000, maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      );

      const parsed = JSON.parse(stdout) as YtDlpJsonInfo;
      const info = parsed.entries && parsed.entries.length > 0 && !parsed.formats ? parsed.entries[0]! : parsed;
      const title = info.title?.trim() || (audioOnly ? "audio" : "video");
      const cleanTitle = title.replace(/[\/\\?%*:|"<>]/g, "_").trim() || (audioOnly ? "audio" : "video");
      const filename = `${cleanTitle}.${audioOnly ? "mp3" : "mp4"}`;

      const { duration, mediaSizes, defaultSize } = computeMediaSizes(info);
      const effectiveSize = audioOnly ? (mediaSizes.audio?.["320"] || defaultSize) : defaultSize;

      return {
        url,
        filename,
        size: effectiveSize,
        formattedSize: effectiveSize > 0 ? formatBytes(effectiveSize) : "Unknown size (stream)",
        resumeSupported: true,
        category: audioOnly ? "music" : "video",
        contentType: audioOnly ? "audio/mpeg" : "video/mp4",
        isMedia: true,
        audioOnly,
        defaultDir: targetDir,
        audioDefaultDir,
        duration,
        mediaSizes,
      };
    } catch (err) {
      log.warn("yt-dlp probe error:", err);
      return {
        url,
        filename: audioOnly ? "audio.mp3" : "video.mp4",
        size: 0,
        formattedSize: "Unknown size (stream)",
        resumeSupported: true,
        category: audioOnly ? "music" : "video",
        contentType: audioOnly ? "audio/mpeg" : "video/mp4",
        isMedia: true,
        audioOnly,
        defaultDir: targetDir,
        audioDefaultDir,
      };
    }
  }

  // 2. Direct HTTP/HTTPS File Probe via HEAD / Range GET
  let defaultReferer = "";
  try {
    defaultReferer = new URL(url).origin + "/";
  } catch {}

  const reqHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": defaultReferer,
    ...(customHeaders || {}),
  };

  let size = 0;
  let filename = "";
  let contentType = "";
  let resumeSupported = false;

  try {
    // Try HEAD request first
    let res = await fetch(url, {
      method: "HEAD",
      headers: reqHeaders,
      redirect: "follow",
    });

    // If HEAD is rejected (405 or 403), try partial GET range 0-0
    if (!res.ok || res.status === 405) {
      res = await fetch(url, {
        method: "GET",
        headers: { ...reqHeaders, Range: "bytes=0-0" },
        redirect: "follow",
      });
    }

    if (res.ok || res.status === 206) {
      contentType = res.headers.get("content-type") || "";
      const lenHeader = res.headers.get("content-length");
      const rangeHeader = res.headers.get("content-range");
      const acceptRanges = res.headers.get("accept-ranges");

      if (rangeHeader) {
        const match = rangeHeader.match(/\/(\d+)$/);
        if (match) size = Number(match[1]);
        resumeSupported = true;
      } else if (lenHeader) {
        size = Number(lenHeader);
      }

      if (acceptRanges === "bytes" || res.status === 206) {
        resumeSupported = true;
      }

      // Extract filename from Content-Disposition
      const disposition = res.headers.get("content-disposition");
      const parsedName = parseFilenameFromHeader(disposition);
      if (parsedName) {
        filename = parsedName;
      }
    }
  } catch (err) {
    log.warn("Direct probe failed:", err);
  }

  // Fallback filename from URL pathname
  if (!filename) {
    try {
      const u = new URL(url);
      const last = u.pathname.split("/").filter(Boolean).pop();
      if (last) {
        filename = decodeURIComponent(last).split("?")[0] || "download.bin";
      }
    } catch {}
  }

  if (!filename) {
    filename = "download.bin";
  }

  const category = detectCategory(filename, contentType);
  let subDirName = "";
  switch (category) {
    case "video": subDirName = "Video"; break;
    case "music": subDirName = "Music"; break;
    case "documents": subDirName = "Documents"; break;
    case "compressed": subDirName = "Compressed"; break;
    case "programs": subDirName = "Programs"; break;
    default: subDirName = ""; break;
  }

  const customDir = categoryDirs?.[category];
  const defaultDir = customDir && customDir.trim()
    ? customDir
    : (subDirName ? path.join(baseDownloadDir, subDirName) : baseDownloadDir);

  return {
    url,
    filename,
    size,
    formattedSize: formatBytes(size),
    resumeSupported,
    category,
    contentType,
    isMedia: false,
    defaultDir,
  };
}
