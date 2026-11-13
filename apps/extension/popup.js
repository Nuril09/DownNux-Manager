// DownNux Manager — Popup Script
// HoodTech

function fmtBytes(n) {
  if (!n) return "Unknown size";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`;
}

async function init() {
  const badge = document.getElementById("statusBadge");
  const ver = document.getElementById("daemonVer");
  const mediaContainer = document.getElementById("mediaList");

  // Check daemon connection
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

  // Get active tab media
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

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
          <div class="media-name" title="${item.url}">${filename}</div>
          <div class="media-meta">${item.kind.toUpperCase()} • ${fmtBytes(item.size)}</div>
        </div>
      `;

      const dlBtn = document.createElement("button");
      dlBtn.className = "btn";
      dlBtn.textContent = "Download";
      dlBtn.onclick = () => {
        dlBtn.textContent = "Added!";
        dlBtn.disabled = true;
        chrome.runtime.sendMessage(
          {
            type: "download-url",
            url: item.url,
            referrer: tab.url,
          },
          (addRes) => {
            if (!addRes?.ok) {
              alert(addRes?.error || "Failed to download");
              dlBtn.textContent = "Download";
              dlBtn.disabled = false;
            }
          }
        );
      };

      row.appendChild(dlBtn);
      mediaContainer.appendChild(row);
    });
  });
}

document.addEventListener("DOMContentLoaded", init);

