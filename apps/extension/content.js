// DownNux Manager — Premium Video Sniffing & Floating Download Widget (MV3)
// HoodTech <https://github.com/Nuril09/DownNux-Manager>

(function () {
  "use strict";

  if (window.__downnux_injected) return;
  window.__downnux_injected = true;

  const floatingHosts = new WeakMap();

  function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.zIndex = "2147483647";
    toast.style.background = isError
      ? "rgba(195, 74, 74, 0.94)"
      : "linear-gradient(135deg, rgba(101, 84, 192, 0.95), rgba(76, 59, 168, 0.95))";
    toast.style.backdropFilter = "blur(16px)";
    toast.style.webkitBackdropFilter = "blur(16px)";
    toast.style.color = "#ffffff";
    toast.style.padding = "10px 18px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(255, 255, 255, 0.2) inset";
    toast.style.border = "1px solid rgba(255, 255, 255, 0.25)";
    toast.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    toast.style.fontSize = "12px";
    toast.style.fontWeight = "600";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "8px";
    toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
    toast.style.transform = "translateY(20px)";
    toast.style.opacity = "0";

    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        ${isError 
          ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' 
          : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    });

    setTimeout(() => {
      toast.style.transform = "translateY(15px)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  function createFloatingButton(video) {
    if (floatingHosts.has(video)) return;

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.zIndex = "2147483647";
    container.style.pointerEvents = "auto";
    container.style.display = "none";
    document.body.appendChild(container);

    const shadow = container.attachShadow({ mode: "closed" });

    const wrapper = document.createElement("div");
    wrapper.className = "downnux-wrapper";

    wrapper.innerHTML = `
      <div class="downnux-btn-group">
        <button class="downnux-btn" title="Download this video with DownNux Manager">
          <div class="downnux-icon-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <span class="downnux-label">DownNux</span>
          <span class="downnux-sep">·</span>
          <span class="downnux-action">Download</span>
          <svg class="downnux-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        <div class="downnux-menu">
          <div class="downnux-menu-header">Select Video Quality</div>
          <button class="downnux-menu-item" data-quality="best">
            <span class="downnux-item-badge">BEST</span>
            <div class="downnux-item-meta">
              <strong>Best Quality (Auto)</strong>
              <small>Highest video & audio combined</small>
            </div>
          </button>
          <button class="downnux-menu-item" data-quality="1080">
            <span class="downnux-item-badge">1080p</span>
            <div class="downnux-item-meta">
              <strong>Full HD (1080p)</strong>
              <small>MP4 Video</small>
            </div>
          </button>
          <button class="downnux-menu-item" data-quality="720">
            <span class="downnux-item-badge">720p</span>
            <div class="downnux-item-meta">
              <strong>HD Ready (720p)</strong>
              <small>Standard MP4</small>
            </div>
          </button>
          <button class="downnux-menu-item" data-quality="audio">
            <span class="downnux-item-badge">AUDIO</span>
            <div class="downnux-item-meta">
              <strong>Audio Only</strong>
              <small>High bitrate MP3 / M4A</small>
            </div>
          </button>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      .downnux-wrapper {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        position: relative;
        user-select: none;
      }
      .downnux-btn-group {
        position: relative;
        display: inline-block;
      }
      .downnux-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, rgba(101, 84, 192, 0.94), rgba(76, 59, 168, 0.94));
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 8px 24px -2px rgba(101, 84, 192, 0.5), 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        outline: none;
      }
      .downnux-btn:hover {
        background: linear-gradient(135deg, #715fd1, #5542b8);
        box-shadow: 0 10px 28px rgba(101, 84, 192, 0.65), 0 2px 8px rgba(0, 0, 0, 0.3);
        transform: translateY(-1.5px) scale(1.02);
        border-color: rgba(255, 255, 255, 0.55);
      }
      .downnux-btn:active {
        transform: translateY(0.5px) scale(0.99);
      }
      .downnux-icon-box {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .downnux-label {
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .downnux-sep {
        opacity: 0.6;
      }
      .downnux-action {
        font-weight: 500;
      }
      .downnux-chevron {
        transition: transform 0.2s ease;
      }
      .downnux-btn-group.open .downnux-chevron {
        transform: rotate(180deg);
      }
      .downnux-menu {
        display: none;
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        width: 220px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(231, 233, 239, 0.95);
        border-radius: 10px;
        box-shadow: 0 16px 40px -4px rgba(32, 38, 49, 0.22), 0 2px 6px rgba(0, 0, 0, 0.05);
        padding: 6px;
        z-index: 2147483647;
      }
      .downnux-btn-group.open .downnux-menu {
        display: block;
        animation: fadeIn 0.15s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .downnux-menu-header {
        font-size: 10px;
        font-weight: 700;
        color: #6e7685;
        text-transform: uppercase;
        padding: 6px 8px 4px 8px;
        letter-spacing: 0.5px;
      }
      .downnux-menu-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 6px;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        transition: background 0.12s ease;
      }
      .downnux-menu-item:hover {
        background: #edeaf9;
      }
      .downnux-item-badge {
        font-size: 9px;
        font-weight: 700;
        background: #edeaf9;
        color: #6554c0;
        padding: 2px 6px;
        border-radius: 4px;
        font-mono: true;
      }
      .downnux-menu-item:hover .downnux-item-badge {
        background: #6554c0;
        color: #ffffff;
      }
      .downnux-item-meta strong {
        display: block;
        font-size: 11px;
        color: #202631;
        font-weight: 600;
      }
      .downnux-item-meta small {
        display: block;
        font-size: 9px;
        color: #6e7685;
      }
    `;

    shadow.appendChild(style);
    shadow.appendChild(wrapper);

    const btnGroup = wrapper.querySelector(".downnux-btn-group");
    const mainBtn = wrapper.querySelector(".downnux-btn");

    function updatePos() {
      const rect = video.getBoundingClientRect();
      if (rect.width < 140 || rect.height < 90 || rect.bottom < 0 || rect.top > window.innerHeight) {
        container.style.display = "none";
        return;
      }
      container.style.top = `${window.scrollY + rect.top + 12}px`;
      container.style.left = `${window.scrollX + rect.right - 185}px`;
      container.style.display = "block";
    }

    let hideTimer = null;
    function scheduleHide() {
      hideTimer = setTimeout(() => {
        if (!btnGroup.classList.contains("open")) {
          container.style.display = "none";
        }
      }, 1000);
    }
    function cancelHide() {
      if (hideTimer) clearTimeout(hideTimer);
    }

    video.addEventListener("mouseenter", () => {
      cancelHide();
      updatePos();
    });
    video.addEventListener("mouseleave", scheduleHide);
    container.addEventListener("mouseenter", cancelHide);
    container.addEventListener("mouseleave", scheduleHide);

    mainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      btnGroup.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        btnGroup.classList.remove("open");
      }
    });

    const triggerDownload = (quality = "best") => {
      btnGroup.classList.remove("open");
      const pageTitle = document.title.replace(/ - YouTube$/i, "").trim();

      chrome.runtime.sendMessage(
        {
          type: "video-download",
          src: video.currentSrc || video.src,
          pageUrl: location.href,
          title: pageTitle,
          quality: quality,
        },
        (res) => {
          if (res?.ok) {
            showToast(`Added to DownNux: ${pageTitle.slice(0, 32)}...`);
          } else {
            showToast(res?.error || "Failed to start video download", true);
          }
        }
      );
    };

    wrapper.querySelectorAll(".downnux-menu-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const q = item.getAttribute("data-quality");
        triggerDownload(q);
      });
    });

    floatingHosts.set(video, container);
  }

  function scanVideos() {
    document.querySelectorAll("video").forEach((v) => createFloatingButton(v));
  }

  // Spotify Web Player floating MP3 download pill (supports track pages & Now Playing bar)
  function initSpotifyFloatingButton() {
    if (!/(?:^|\.)spotify\.com$/i.test(location.hostname) || window.self !== window.top) return;

    const TRACK_OR_EPISODE_RE = /\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(track|episode)\/([a-zA-Z0-9]+)/i;

    function detectSpotifyTrackUrl() {
      const urlMatch = location.pathname.match(TRACK_OR_EPISODE_RE);
      if (urlMatch) {
        return `https://open.spotify.com/${urlMatch[1].toLowerCase()}/${urlMatch[2]}`;
      }
      const nowPlayingLink =
        document.querySelector('[data-testid="now-playing-widget"] a[data-testid="context-item-link"][href*="/track/"]') ||
        document.querySelector('[data-testid="now-playing-widget"] a[href*="/track/"]') ||
        document.querySelector('[data-testid="now-playing-widget"] a[href*="/episode/"]');
      if (nowPlayingLink) {
        const href = nowPlayingLink.getAttribute("href") || "";
        const m = href.match(TRACK_OR_EPISODE_RE);
        if (m) return `https://open.spotify.com/${m[1].toLowerCase()}/${m[2]}`;
      }
      return null;
    }

    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.bottom = "96px";
    host.style.right = "20px";
    host.style.zIndex = "2147483646";
    host.style.display = "none";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "closed" });
    const wrap = document.createElement("div");
    wrap.className = "dn-sp-wrap";
    wrap.innerHTML = `
      <div class="dn-sp-group">
        <button class="dn-sp-btn" title="Download Spotify audio via DownNux Manager">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>DownNux · MP3</span>
        </button>
        <div class="dn-sp-menu">
          <div class="dn-sp-hdr">Spotify Audio Quality</div>
          <button class="dn-sp-item" data-bitrate="320"><strong>320 kbps</strong><small>Studio MP3 + Cover Art</small></button>
          <button class="dn-sp-item" data-bitrate="192"><strong>192 kbps</strong><small>High Quality MP3</small></button>
          <button class="dn-sp-item" data-bitrate="128"><strong>128 kbps</strong><small>Compact MP3</small></button>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      .dn-sp-wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
      .dn-sp-group { position: relative; display: inline-block; }
      .dn-sp-btn {
        display: inline-flex; align-items: center; gap: 7px;
        background: linear-gradient(135deg, #1db954, #169c46);
        color: #09130c; border: 1px solid rgba(255,255,255,0.35);
        border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 700;
        cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.45); transition: transform 0.15s ease;
      }
      .dn-sp-btn:hover { transform: translateY(-1px) scale(1.02); }
      .dn-sp-menu {
        display: none; position: absolute; bottom: calc(100% + 8px); right: 0; width: 190px;
        background: rgba(24, 26, 36, 0.96); color: #f0f3f6;
        border: 1px solid rgba(255,255,255,0.14); border-radius: 10px;
        padding: 6px; box-shadow: 0 14px 36px rgba(0,0,0,0.5);
      }
      .dn-sp-group.open .dn-sp-menu { display: block; }
      .dn-sp-hdr { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ea4b5; padding: 4px 8px; font-weight: 700; }
      .dn-sp-item {
        width: 100%; display: flex; flex-direction: column; align-items: flex-start;
        background: transparent; border: none; border-radius: 6px; padding: 6px 8px;
        color: #f0f3f6; cursor: pointer; text-align: left;
      }
      .dn-sp-item:hover { background: rgba(29, 185, 84, 0.2); }
      .dn-sp-item strong { font-size: 11px; }
      .dn-sp-item small { font-size: 10px; color: #9ea4b5; }
    `;
    shadow.appendChild(style);
    shadow.appendChild(wrap);

    const group = wrap.querySelector(".dn-sp-group");
    const mainBtn = wrap.querySelector(".dn-sp-btn");

    mainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      group.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!host.contains(e.target)) group.classList.remove("open");
    });

    wrap.querySelectorAll(".dn-sp-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        group.classList.remove("open");
        const bitrate = item.getAttribute("data-bitrate") || "320";
        const trackUrl = detectSpotifyTrackUrl();
        if (!trackUrl) {
          showToast("Buka halaman lagu atau putar lagu dulu di Spotify", true);
          return;
        }
        chrome.runtime.sendMessage(
          { type: "download-url", url: trackUrl, referrer: location.href, format: "audio", audioQuality: bitrate },
          (res) => {
            if (res?.ok) {
              showToast(`Spotify Audio (${bitrate}k) ditambahkan ke DownNux`);
            } else {
              showToast(res?.error || "Gagal terhubung ke DownNux Manager", true);
            }
          },
        );
      });
    });

    const syncVisibility = () => {
      host.style.display = detectSpotifyTrackUrl() ? "block" : "none";
    };
    syncVisibility();
    setInterval(syncVisibility, 1500);
  }

  scanVideos();
  initSpotifyFloatingButton();
  const observer = new MutationObserver(() => scanVideos());
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
