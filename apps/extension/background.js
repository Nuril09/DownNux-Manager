// Service worker ekstensi DownNux Manager (MV3) by HoodTech.

const HOST = "com.creativemichiz.downnux.native_host";
const RPC_HTTP_URL = "http://127.0.0.1:44990/api/rpc";
const ALLOWED_RPC_METHODS = new Set(["ping", "task.add", "task.list", "task.get", "task.pause", "task.resume"]);

const AUDIO_PLATFORM_RE = /(?:spotify\.com|spotify\.link|spoti\.fi|soundcloud\.com|bandcamp\.com)/i;
const SPOTIFY_URL_RE = /(?:^|\.)(?:spotify\.com|spotify\.link|spoti\.fi)$/i;
const VIDEO_PLATFORM_RE = /youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|twitter\.com|x\.com|instagram\.com|twitch\.tv|dailymotion\.com|reddit\.com|facebook\.com/i;

const DEFAULTS = {
  captureEnabled: true,
  minSizeBytes: 0,
  excludedHosts: ["localhost"],
};

async function getSettings() {
  const s = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}

function isSpotifyHost(url) {
  try {
    return SPOTIFY_URL_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Komunikasi ke aplikasi lewat native messaging (Linux) + HTTP RPC fallback (Windows/macOS)

async function callDaemonHttp(method, params = {}) {
  if (!ALLOWED_RPC_METHODS.has(method)) {
    throw new Error(`Method tidak diizinkan: ${method}`);
  }
  const res = await fetch(RPC_HTTP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message || `DownNux daemon HTTP ${res.status}`);
  }
  if (!json) throw new Error("Tidak ada balasan dari daemon DownNux");
  if (json.error) throw new Error(json.error.message || json.error.code);
  return json.result;
}

class NativeRpcError extends Error {}

let seq = 0;
async function callDaemon(method, params = {}) {
  try {
    const resp = await chrome.runtime.sendNativeMessage(HOST, { id: ++seq, method, params });
    if (resp && !resp.error) return resp.result;
    if (resp?.error && resp.error.code !== "UNAVAILABLE") {
      throw new NativeRpcError(resp.error.message || resp.error.code);
    }
  } catch (err) {
    if (err instanceof NativeRpcError) throw err;
    // Native messaging host tidak terdaftar / belum siap (Windows, macOS, dll.) -> fallback ke HTTP RPC lokal
  }
  return callDaemonHttp(method, params);
}

async function cookieHeaderFor(url) {
  try {
    const cookies = await chrome.cookies.getAll({ url });
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  } catch {
    return "";
  }
}

async function sendToApp({ url, referrer, filename, format, videoQuality, audioQuality }) {
  const isAudioSite = AUDIO_PLATFORM_RE.test(url);
  const effectiveFormat = isAudioSite ? "audio" : format;
  const effectiveAudioQuality = effectiveFormat === "audio" ? (audioQuality || "320") : audioQuality;

  const cookie = isSpotifyHost(url) ? "" : await cookieHeaderFor(url);
  const headers = { userAgent: navigator.userAgent };
  if (cookie) headers.cookie = cookie;
  if (referrer) headers.referer = referrer;
  if (effectiveFormat) headers.format = effectiveFormat;
  if (videoQuality && effectiveFormat !== "audio") headers.videoQuality = videoQuality;
  if (effectiveAudioQuality) headers.audioQuality = effectiveAudioQuality;

  const params = { url, headers, source: "browser" };
  // Biarkan daemon menentukan nama file resmi "Artis - Judul.mp3" untuk link Spotify
  if (filename && !isSpotifyHost(url)) params.filename = filename;
  return callDaemon("task.add", params);
}

function notify(title, message) {
  chrome.notifications.create({ type: "basic", iconUrl: "icon.png", title, message });
}

// ---------------------------------------------------------------------------
// Tangkap download otomatis

const passThrough = new Set();

chrome.downloads.onCreated.addListener(async (item) => {
  const s = await getSettings();
  if (!s.captureEnabled) return;
  const url = item.finalUrl || item.url;
  if (!/^https?:/i.test(url)) return;
  if (passThrough.delete(url)) return;
  if (item.byExtensionId === chrome.runtime.id) return;
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }
  if (s.excludedHosts.some((h) => host === h || host.endsWith("." + h))) return;
  if (s.minSizeBytes > 0 && item.fileSize > 0 && item.fileSize < s.minSizeBytes) return;

  try {
    await chrome.downloads.pause(item.id);
  } catch {
    // Mungkin sudah selesai (file kecil). Tetap coba alihkan.
  }
  try {
    const name = item.filename ? item.filename.split(/[/\\]/).pop() : undefined;
    const task = await sendToApp({ url, referrer: item.referrer, filename: name });
    await chrome.downloads.cancel(item.id).catch(() => {});
    await chrome.downloads.erase({ id: item.id }).catch(() => {});
    console.debug("Dialihkan ke DownNux", task.id);
  } catch (err) {
    console.warn("Gagal mengalihkan ke DownNux, dilanjutkan oleh browser:", err);
    await chrome.downloads.resume(item.id).catch(() => {});
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
  }
});

// ---------------------------------------------------------------------------
// Menu klik kanan

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "downnux-link",
      title: "Download with DownNux Manager",
      contexts: ["link", "video", "audio", "image", "page"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const candidate = info.linkUrl || info.srcUrl || info.pageUrl || tab?.url;
  if (!candidate || !/^https?:/i.test(candidate)) {
    notify("DownNux Manager", "This link cannot be downloaded directly (not http/https).");
    return;
  }
  const isAudio = AUDIO_PLATFORM_RE.test(candidate);
  try {
    await sendToApp({
      url: candidate,
      referrer: info.pageUrl || tab?.url,
      format: isAudio ? "audio" : undefined,
      audioQuality: isAudio ? "320" : undefined,
    });
    notify("DownNux Manager", isAudio ? "Audio queued in DownNux Manager." : "Download queued in DownNux Manager.");
  } catch (err) {
    notify("DownNux Manager Not Connected", String(err.message || err));
  }
});

// ---------------------------------------------------------------------------
// Deteksi media dari lalu lintas jaringan

const MEDIA_TYPES = [
  { re: /^video\//i, kind: "video" },
  { re: /^audio\//i, kind: "audio" },
  { re: /mpegurl/i, kind: "hls" },
  { re: /dash\+xml/i, kind: "dash" },
];
const MEDIA_EXT = /\.(mp4|webm|mkv|mov|m4v|mp3|m4a|ogg|opus|flac|wav|m3u8|mpd)(\?|$)/i;

function classify(url, contentType) {
  for (const m of MEDIA_TYPES) if (contentType && m.re.test(contentType)) return m.kind;
  const ext = url.match(MEDIA_EXT)?.[1]?.toLowerCase();
  if (!ext) return null;
  if (ext === "m3u8") return "hls";
  if (ext === "mpd") return "dash";
  if (["mp3", "m4a", "ogg", "opus", "flac", "wav"].includes(ext)) return "audio";
  return "video";
}

const SEGMENT_RE = /\.(ts|m4s|m4f|aac)(\?|$)|\/(seg|segment|chunk|frag)[-_]?\d+/i;

async function mediaFor(tabId) {
  const key = `media:${tabId}`;
  return (await chrome.storage.session.get(key))[key] || [];
}

async function addMedia(tabId, entry) {
  const key = `media:${tabId}`;
  const list = await mediaFor(tabId);
  if (list.some((m) => m.url === entry.url)) return;
  list.push(entry);
  const trimmed = list.slice(-50);
  await chrome.storage.session.set({ [key]: trimmed });
  await chrome.action.setBadgeText({ tabId, text: String(trimmed.length) });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#6554c0" });
}

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const header = (n) => details.responseHeaders?.find((h) => h.name.toLowerCase() === n)?.value || "";
    const contentType = header("content-type");
    const kind = classify(details.url, contentType);
    if (!kind) return;
    if (SEGMENT_RE.test(details.url) && kind !== "hls" && kind !== "dash") return;
    const size = Number(header("content-length")) || 0;
    if ((kind === "video" || kind === "audio") && details.statusCode === 206 && size < 64 * 1024) return;
    void addMedia(details.tabId, {
      url: details.url,
      kind,
      contentType,
      size,
      detectedAt: Date.now(),
    });
  },
  { urls: ["http://*/*", "https://*/*"], types: ["media", "xmlhttprequest", "other", "object"] },
  ["responseHeaders"],
);

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(`media:${tabId}`));
chrome.webNavigation?.onCommitted?.addListener((d) => {
  if (d.frameId === 0) chrome.storage.session.remove(`media:${d.tabId}`);
});
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading" && info.url) chrome.storage.session.remove(`media:${tabId}`);
});

// ---------------------------------------------------------------------------
// Pesan dari content script dan popup

async function downloadVideo({ src, pageUrl, title, quality, audioQuality }, tabId) {
  const isAudioPlatform = AUDIO_PLATFORM_RE.test(pageUrl);
  const isVideoPlatform = isAudioPlatform || VIDEO_PLATFORM_RE.test(pageUrl);

  const isAudio = isAudioPlatform || quality === "audio";
  const videoQuality = isAudio ? undefined : (quality || "best");
  const resolvedAudioQuality = isAudio ? (audioQuality || "320") : undefined;

  if (isVideoPlatform) {
    const filename =
      !isSpotifyHost(pageUrl) && title
        ? `${title.replace(/[\/\\?%*:|"<>]/g, "_")}.${isAudio ? "mp3" : "mp4"}`
        : undefined;
    return sendToApp({
      url: pageUrl,
      referrer: pageUrl,
      filename,
      format: isAudio ? "audio" : "video",
      videoQuality,
      audioQuality: resolvedAudioQuality,
    });
  }

  if (src && /^https?:/i.test(src)) {
    return sendToApp({ url: src, referrer: pageUrl, filename: title ? `${title}.mp4` : undefined });
  }

  const media = await mediaFor(tabId);
  const direct = [...media].reverse().find((m) => m.kind === "video" && !SEGMENT_RE.test(m.url));
  const stream = [...media].reverse().find((m) => m.kind === "hls" || m.kind === "dash");
  if (direct) {
    return sendToApp({ url: direct.url, referrer: pageUrl, filename: title ? `${title}.mp4` : undefined });
  }
  if (stream) {
    return sendToApp({ url: stream.url, referrer: pageUrl, filename: title ? `${title}.mp4` : undefined });
  }

  return sendToApp({
    url: pageUrl,
    referrer: pageUrl,
    filename: title ? `${title}.mp4` : undefined,
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = msg.tabId ?? sender.tab?.id;
  (async () => {
    switch (msg.type) {
      case "ping":
        return callDaemon("ping");
      case "video-download":
        return downloadVideo(msg, tabId);
      case "media-list":
        return mediaFor(tabId);
      case "download-url":
        return sendToApp({
          url: msg.url,
          referrer: msg.referrer,
          filename: msg.filename,
          format: msg.format,
          videoQuality: msg.videoQuality,
          audioQuality: msg.audioQuality,
        });
      default:
        throw new Error(`Pesan tidak dikenal: ${msg.type}`);
    }
  })()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
  return true;
});
