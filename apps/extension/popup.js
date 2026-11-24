// DownNux Manager — Popup Script
// HoodTech

const SPOTIFY_TRACK_RE = /^https?:\/\/(?:open|play)\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(track|episode)\/([a-zA-Z0-9]+)/i;
const SPOTIFY_HOST_RE = /^https?:\/\/(?:open|play)\.spotify\.com/i;
const AUDIO_PLATFORM_RE = /soundcloud\.com|bandcamp\.com/i;
const VIDEO_PLATFORM_RE = /youtube\.com\/(?:watch|shorts)|youtu\.be\/|tiktok\.com|vimeo\.com|twitter\.com|x\.com|instagram\.com|twitch\.tv|dailymotion\.com|reddit\.com|facebook\.com/i;

function fmtBytes(n) {
  if (!n) return "Unknown size";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`;
}

function wireQuickButton(btn, payload, defaultLabel) {
  btn.onclick = () => {
    btn.textContent = "Sending...";
    btn.disabled = true;
    chrome.runtime.sendMessage(payload, (res) => {
      if (res?.ok) {
        btn.textContent = "Added!";
      } else {
        alert(res?.error || "Failed to send to DownNux Manager");
        btn.textContent = defaultLabel;
        btn.disabled = false;
      }
    });
  };
}

function renderQuickPageAction(tab) {
  const url = tab?.url || "";
  if (!/^https?:/i.test(url)) return;

  const section = document.getElementById("pageMediaSection");
  const container = document.getElementById("pageMediaCard");
  if (!section || !container) return;

  const cleanTitle = (tab.title || url)
    .replace(/\s*[-|–]\s*(YouTube|Spotify|SoundCloud).*$/i, "")
    .trim();

  if (SPOTIFY_TRACK_RE.test(url)) {
    section.style.display = "block";
    const card = document.createElement("div");
    card.className = "quick-card spotify";
    card.innerHTML = `
      <div class="quick-title" title="${cleanTitle}"></div>
      <div class="quick-meta">Spotify Track · Auto-matched MP3 + ID3 Cover Art</div>
      <div class="quick-actions"></div>
    `;
    card.querySelector(".quick-title").textContent = cleanTitle;
    const actions = card.querySelector(".quick-actions");

    const btn320 = document.createElement("button");
    btn320.className = "btn spotify";
    btn320.textContent = "Download MP3 (320k)";
    wireQuickButton(
      btn320,
      { type: "download-url", url, referrer: url, format: "audio", audioQuality: "320" },
      "Download MP3 (320k)",
    );

    const btn192 = document.createElement("button");
    btn192.className = "btn secondary";
    btn192.textContent = "MP3 192k";
    wireQuickButton(
      btn192,
      { type: "download-url", url, referrer: url, format: "audio", audioQuality: "192" },
      "MP3 192k",
    );

    actions.appendChild(btn320);
    actions.appendChild(btn192);
    container.appendChild(card);
    return;
  }

  if (SPOTIFY_HOST_RE.test(url)) {
    section.style.display = "block";
    const card = document.createElement("div");
    card.className = "quick-card spotify";
    card.innerHTML = `
      <div class="quick-title">Spotify Web Player Detected</div>
      <div class="quick-meta" style="margin-bottom:0">Open a single track page, play a song and click the floating DownNux button, or right-click any track link &rarr; Download with DownNux.</div>
    `;
    container.appendChild(card);
    return;
  }

  if (AUDIO_PLATFORM_RE.test(url)) {
    section.style.display = "block";
    const card = document.createElement("div");
    card.className = "quick-card";
    card.innerHTML = `
      <div class="quick-title"></div>
      <div class="quick-meta">Audio Platform · Direct MP3 Extraction</div>
      <div class="quick-actions"></div>
    `;
    card.querySelector(".quick-title").textContent = cleanTitle;
    const actions = card.querySelector(".quick-actions");

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Download MP3 (320k)";
    wireQuickButton(
      btn,
      { type: "download-url", url, referrer: url, format: "audio", audioQuality: "320" },
      "Download MP3 (320k)",
    );
    actions.appendChild(btn);
    container.appendChild(card);
    return;
  }

  if (VIDEO_PLATFORM_RE.test(url)) {
    section.style.display = "block";
    const card = document.createElement("div");
    card.className = "quick-card";
    card.innerHTML = `
      <div class="quick-title"></div>
      <div class="quick-meta">Online Media Page · yt-dlp Hybrid Engine</div>
      <div class="quick-actions"></div>
    `;
    card.querySelector(".quick-title").textContent = cleanTitle;
    const actions = card.querySelector(".quick-actions");

    const btnMp4 = document.createElement("button");
    btnMp4.className = "btn";
    btnMp4.textContent = "Video MP4 (Best)";
    wireQuickButton(
      btnMp4,
      { type: "video-download", pageUrl: url, title: cleanTitle, quality: "best" },
      "Video MP4 (Best)",
    );

    const btnMp3 = document.createElement("button");
    btnMp3.className = "btn secondary";
    btnMp3.textContent = "Audio MP3 (320k)";
    wireQuickButton(
      btnMp3,
      { type: "video-download", pageUrl: url, title: cleanTitle, quality: "audio", audioQuality: "320" },
      "Audio MP3 (320k)",
    );

    actions.appendChild(btnMp4);
    actions.appendChild(btnMp3);
    container.appendChild(card);
  }
}

async function init() {
  const badge = document.getElementById("statusBadge");
  const ver = document.getElementById("daemonVer");
  const mediaContainer = document.getElementById("mediaList");

  chrome.runtime.sendMessage({ type: "ping" }, (res) => {
    if (res?.ok) {
      badge.className = "badge connected";
      badge.textContent = "Connected";
      ver.textContent = `Daemon v${res.result.version}`;
    } else {
      badge.className = "badge disconnected";
      badge.textContent = "Disconnected";
      ver.textContent = "Daemon inactive";
    }
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  renderQuickPageAction(tab);

  chrome.runtime.sendMessage({ type: "media-list", tabId: tab.id }, (res) => {
    if (!res?.ok || !res.result?.length) return;

    mediaContainer.innerHTML = "";
    res.result.forEach((item) => {
      const row = document.createElement("div");
      row.className = "media-item";

      const urlObj = new URL(item.url);
      const filename = urlObj.pathname.split("/").pop() || `${item.kind}.${item.contentType?.split("/")[1] || "mp4"}`;

      row.innerHTML = `
        <div class="media-info">
          <div class="media-name"></div>
          <div class="media-meta">${item.kind.toUpperCase()} · ${fmtBytes(item.size)}</div>
        </div>
      `;
      const nameEl = row.querySelector(".media-name");
      nameEl.title = item.url;
      nameEl.textContent = filename;

      const dlBtn = document.createElement("button");
      dlBtn.className = "btn";
      dlBtn.textContent = "Download";
      wireQuickButton(
        dlBtn,
        { type: "download-url", url: item.url, referrer: tab.url },
        "Download",
      );

      row.appendChild(dlBtn);
      mediaContainer.appendChild(row);
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
