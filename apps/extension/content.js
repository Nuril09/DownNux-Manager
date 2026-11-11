// DownNux Manager — Content Script (Floating Download Button on Videos)
// CreativeMichiz

(function () {
  "use strict";

  // Prevent double injection
  if (window.__downnux_injected) return;
  window.__downnux_injected = true;

  const floatingHosts = new WeakMap();

  function createFloatingButton(video) {
    if (floatingHosts.has(video)) return;

    // Use Shadow DOM to prevent website styles from breaking our button
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.zIndex = "2147483647";
    container.style.pointerEvents = "auto";
    container.style.display = "none";
    document.body.appendChild(container);

    const shadow = container.attachShadow({ mode: "closed" });
    const btn = document.createElement("button");
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download Video</span>
    `;

    const style = document.createElement("style");
    style.textContent = `
      button {
        display: inline-flex;
        align-items: center;
        background: rgba(18, 20, 24, 0.88);
        backdrop-filter: blur(8px);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 5px 10px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
        transition: all 0.15s ease;
      }
      button:hover {
        background: #1a73e8;
        border-color: #1a73e8;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(26, 115, 232, 0.4);
      }
      button:active {
        transform: translateY(0);
      }
    `;
    shadow.appendChild(style);
    shadow.appendChild(btn);

    function updatePos() {
      const rect = video.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 80 || rect.bottom < 0 || rect.top > window.innerHeight) {
        container.style.display = "none";
        return;
      }
      container.style.top = `${window.scrollY + rect.top + 10}px`;
      container.style.left = `${window.scrollX + rect.right - 140}px`;
      container.style.display = "block";
    }

    let hideTimer = null;
    function scheduleHide() {
      hideTimer = setTimeout(() => {
        container.style.display = "none";
      }, 800);
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

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      btn.innerText = "Sending...";
      chrome.runtime.sendMessage(
        {
          type: "video-download",
          src: video.currentSrc || video.src,
          pageUrl: location.href,
          title: document.title,
        },
        (res) => {
          if (res?.ok) {
            btn.innerText = "Added to DownNux!";
            setTimeout(() => {
              btn.innerHTML = "<span>Download Video</span>";
            }, 2000);
          } else {
            alert(res?.error || "Failed to send to DownNux Manager");
            btn.innerHTML = "<span>Download Video</span>";
          }
        }
      );
    });

    floatingHosts.set(video, container);
  }

  function scanVideos() {
    document.querySelectorAll("video").forEach((v) => createFloatingButton(v));
  }

  // Initial scan + MutationObserver for dynamically added videos
  scanVideos();
  const observer = new MutationObserver(() => scanVideos());
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();

