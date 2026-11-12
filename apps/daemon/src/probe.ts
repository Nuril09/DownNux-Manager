import { execFileSync } from "node:child_process";
import path from "node:path";
import { type UrlProbeResult } from "@downnux/shared";
import { isMediaSite } from "./engine/ytdlp.ts";
import { logger } from "./log.ts";

const log = logger("probe");

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
  const isMedia = isMediaSite(url);

  // 1. YouTube / Social Video Probe via yt-dlp
  if (isMedia) {
    const ytDlpPath = path.join(process.env.HOME || "", ".local/bin/yt-dlp");
    const customVideoDir = categoryDirs?.video;
    const targetDir = customVideoDir && customVideoDir.trim() ? customVideoDir : path.join(baseDownloadDir, "Video");

    try {
      const output = execFileSync(ytDlpPath, [
        "--js-runtimes", "node:/usr/bin/node",
        "--print", "%(title)s;;;%(filesize,filesize_approx)s;;;%(ext)s",
        "--no-playlist",
        url,
      ], { encoding: "utf8", timeout: 9000 }).trim();

      const parts = output.split(";;;");
      const title = parts[0]?.trim() || "video";
      const sizeBytes = Number(parts[1]) || 0;
      const cleanTitle = title.replace(/[\/\\?%*:|"<>]/g, "_").trim();
      const filename = `${cleanTitle}.mp4`;

      return {
        url,
        filename,
        size: sizeBytes,
        formattedSize: formatBytes(sizeBytes),
        resumeSupported: true,
        category: "video",
        contentType: "video/mp4",
        isMedia: true,
        defaultDir: targetDir,
      };
    } catch (err) {
      log.warn("yt-dlp probe error:", err);
      return {
        url,
        filename: "video.mp4",
        size: 0,
        formattedSize: "Unknown size (stream)",
        resumeSupported: true,
        category: "video",
        contentType: "video/mp4",
        isMedia: true,
        defaultDir: targetDir,
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
        filename = decodeURIComponent(last).split("?")[0];
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
