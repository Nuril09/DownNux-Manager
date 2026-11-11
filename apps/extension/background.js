// Service worker ekstensi DownNux Manager (MV3) by CreativeMichiz.
// Spike M0: ditulis sebagai JS biasa tanpa build. Dipindah ke WXT + TypeScript di M3.

const HOST = "com.creativemichiz.downnux.native_host";

const DEFAULTS = {
  captureEnabled: true,
  // Ukuran minimum file yang ditangkap (byte). 0 = semua.
  minSizeBytes: 0,
  // Host yang tidak ditangkap (download dibiarkan ke browser).
  excludedHosts: ["localhost"],
};

async function getSettings() {
  const s = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}

// ---------------------------------------------------------------------------
// Komunikasi ke aplikasi lewat native messaging

let seq = 0;
async function callDaemon(method, params = {}) {
  const resp = await chrome.runtime.sendNativeMessage(HOST, { id: ++seq, method, params });
  if (!resp) throw new Error("Tidak ada balasan dari native host");
  if (resp.error) throw new Error(resp.error.message || resp.error.code);
  return resp.result;
}

async function cookieHeaderFor(url) {
  try {
    const cookies = await chrome.cookies.getAll({ url });
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  } catch {
    return "";
  }
}

async function sendToApp({ url, referrer, filename, format }) {
  const cookie = await cookieHeaderFor(url);
  const headers = { userAgent: navigator.userAgent };
  if (cookie) headers.cookie = cookie;
  if (referrer) headers.referer = referrer;
  if (format) headers.format = format;
  const params = { url, headers, source: "browser" };
  if (filename) params.filename = filename;
  return callDaemon("task.add", params);
}

function notify(title, message) {
  chrome.notifications.create({ type: "basic", iconUrl: "icon.png", title, message });
}

// ---------------------------------------------------------------------------
// Tangkap download otomatis

// URL yang sengaja dibiarkan ke browser (mis. fallback saat aplikasi tidak berjalan).
const passThrough = new Set();

chrome.downloads.onCreated.addListener(async (item) => {
  const s = await getSettings();
  if (!s.captureEnabled) return;
  const url = item.finalUrl || item.url;
  if (!/^https?:/i.test(url)) return; // blob:, data:, file: tidak bisa diteruskan
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

  // Jeda dulu; batalkan hanya jika aplikasi berhasil menerima, supaya download tidak hilang.
  try {
    await chrome.downloads.pause(item.id);
  } catch {
    // Mungkin sudah selesai (file kecil). Tetap coba alihkan.
  }
  try {
    const name = item.filename ? item.filename.split("/").pop() : undefined;
    const task = await sendToApp({ url, referrer: item.referrer, filename: name });
    await chrome.downloads.cancel(item.id).catch(() => {});
    await chrome.downloads.erase({ id: item.id }).catch(() => {});
    console.debug("Dialihkan ke Unduh", task.id);
  } catch (err) {
    console.warn("Gagal mengalihkan ke Unduh, dilanjutkan oleh browser:", err);
    await chrome.downloads.resume(item.id).catch(() => {});
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
  }
});

// ---------------------------------------------------------------------------
// Menu klik kanan

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "unduh-link",
    title: "Download dengan Unduh",
    contexts: ["link", "video", "audio", "image"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.srcUrl;
  if (!url || !/^https?:/i.test(url)) {
    notify("Unduh", "Tautan ini tidak bisa diunduh langsung (bukan http/https).");
    return;
  }
  try {
    await sendToApp({ url, referrer: info.pageUrl || tab?.url });
  } catch (err) {
    notify("Unduh tidak terhubung", String(err.message || err));
  }
});

// ---------------------------------------------------------------------------
// Deteksi media dari lalu lintas jaringan (PRD 6.6)

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

// Potongan segmen HLS/DASH dan fragmen kecil tidak relevan untuk ditampilkan.
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
  // Simpan 50 terakhir per tab supaya memori tidak tumbuh.
  const trimmed = list.slice(-50);
  await chrome.storage.session.set({ [key]: trimmed });
  await chrome.action.setBadgeText({ tabId, text: String(trimmed.length) });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#1a73e8" });
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
    // Abaikan potongan kecil (iklan pendek, thumbnail animasi, range parsial).
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

// Bersihkan daftar media saat tab ditutup atau berpindah halaman.
chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(`media:${tabId}`));
chrome.webNavigation?.onCommitted?.addListener((d) => {
  if (d.frameId === 0) chrome.storage.session.remove(`media:${d.tabId}`);
});
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading" && info.url) chrome.storage.session.remove(`media:${tabId}`);
});

// ---------------------------------------------------------------------------
// Pesan dari content script dan popup

async function downloadVideo({ src, pageUrl, title, quality }, tabId) {
  const isVideoPlatform = /youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|twitter\.com|x\.com|instagram\.com|twitch\.tv|dailymotion\.com|reddit\.com|facebook\.com/i.test(pageUrl);
  
  if (isVideoPlatform) {
    const filename = title ? `${title.replace(/[\/\\?%*:|"<>]/g, "_")}.${quality === "audio" ? "mp3" : "mp4"}` : undefined;
    return sendToApp({
      url: pageUrl,
      referrer: pageUrl,
      filename,
      format: quality === "audio" ? "audio" : "video",
    });
  }

  // 1) <video src> langsung (http/https) -> engine biasa.
  if (src && /^https?:/i.test(src)) {
    return sendToApp({ url: src, referrer: pageUrl, filename: title ? `${title}.mp4` : undefined });
  }

  // 2) blob:/MSE -> cari hasil sniffing media jaringan.
  const media = await mediaFor(tabId);
  const direct = [...media].reverse().find((m) => m.kind === "video" && !SEGMENT_RE.test(m.url));
  const stream = [...media].reverse().find((m) => m.kind === "hls" || m.kind === "dash");
  if (direct) {
    return sendToApp({ url: direct.url, referrer: pageUrl, filename: title ? `${title}.mp4` : undefined });
  }
  if (stream) {
    return sendToApp({ url: stream.url, referrer: pageUrl, filename: title ? `${title}.mp4` : undefined });
  }

  // Fallback terakhir: kirim URL halaman agar diproses oleh engine hybrid
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
        return sendToApp({ url: msg.url, referrer: msg.referrer });
      default:
        throw new Error(`Pesan tidak dikenal: ${msg.type}`);
    }
  })()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
  return true; // balasan asinkron
});

