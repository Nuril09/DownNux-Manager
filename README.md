# DownNux Manager

DownNux Manager is a high-performance, segmented download manager and media accelerator built natively for Linux (Ubuntu, Debian, and derivatives). Inspired by the workflow and capabilities of Internet Download Manager (IDM), DownNux Manager splits downloads into multiple parallel HTTP connections, automatically recovers interrupted downloads, runs an independent background daemon via systemd, and integrates directly with modern web browsers to capture downloads and sniff video streams.

Developed by **CreativeMichiz**. Licensed under the **GNU General Public License v3.0 (GPLv3)**.

---

## Key Capabilities

- **Segmented Acceleration Engine**: Splits files dynamically into up to 16/32 parallel Range connections (default: 8) powered by a hybrid `aria2` + `yt-dlp` core.
- **Independent Background Daemon**: Downloads are executed and monitored by a persistent background service (`systemd --user`). Closing the GUI window or logging out never terminates active downloads.
- **Native Desktop GUI & iOS Glassmorphism Aesthetic**: A dedicated native desktop window built with GTK3, WebKit2, React, and Tailwind CSS. Features frosted translucent glass panels, live 60-second speed curve graphs, and real-time segment progress meters.
- **Native Debian/Ubuntu (.deb) Package**: Installs natively into `/usr/bin/downnux`, `/usr/bin/downnux-gui`, and adds an application launcher to the GNOME/Ubuntu Application Menu.
- **Browser Integration (Chrome, Brave, Edge, Chromium, Firefox)**:
  - Intercepts file downloads and forwards cookies, referrers, and user-agent headers.
  - Floating download badge over HTML5 video elements with quality selection (Best Quality, 1080p Full HD, 720p HD, 480p SD, and Audio Only).
  - Native video platform support (YouTube, TikTok, Vimeo, Twitter/X, and HLS/DASH streams) with automatic audio/video muxing via FFmpeg.
- **Crash Resistance & SQLite WAL State Store**: Tracks byte offsets and checksums in an embedded SQLite database. Recovers seamlessly after system reboots, network drops, or kernel panics.
- **Bilingual Interface**: Full support for English (default) and Indonesian (Bahasa Indonesia).

---

## Architectural Breakdown

DownNux Manager follows a decoupled 4-tier service architecture:

```
┌────────────────────────────────────────────────────────┐
│                   Web Browsers                         │
│  Chrome  ·  Brave  ·  Edge  ·  Chromium  ·  Firefox    │
│  (Manifest V3 Extension with Floating Video Sniffer)   │
└──────────────────────────┬─────────────────────────────┘
                           │ Native Messaging (stdio)
┌──────────────────────────▼─────────────────────────────┐
│                 apps/native-host                       │
│    Native Messaging Bridge (Validates & Forwards)      │
└──────────────────────────┬─────────────────────────────┘
                           │ Unix Domain Socket
┌──────────────────────────▼─────────────────────────────┐
│                   apps/daemon                          │
│   Background Service (systemd --user, node:sqlite)     │
│   Hybrid Engine: aria2c (Files) + yt-dlp/ffmpeg (Video)│
│   HTTP/WebSocket Local API Server (127.0.0.1:44990)    │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
┌──────────────▼────────────┐  ┌──────────▼──────────────┐
│       apps/gui            │  │      CLI (downnux)      │
│ Native GTK3/WebKit Window │  │ Terminal control tool   │
└───────────────────────────┘  └─────────────────────────┘
```

1. **`apps/daemon`**: Background system service. Manages the download queue, SQLite WAL database, connection limits, and child processes (`aria2c` and `yt-dlp`). Exposes a Unix domain socket at `~/.local/state/downnux/daemon.sock` and a local HTTP/WebSocket API on port `44990`.
2. **`apps/gui`**: Desktop application interface with real-time transfer stats, connection segment bars, search filters, and task controls.
3. **`apps/native-host`**: Stdio native messaging executable invoked by web browsers to relay captured download URLs, HTTP headers, and cookies to the daemon.
4. **`apps/extension`**: Browser extension capturing downloads and injecting the floating video download badge into web pages.

---

## System Requirements

- **Operating System**: Linux (Ubuntu 22.04 LTS, 24.04 LTS, 26.04 or compatible Debian/apt distribution)
- **Runtime**: Node.js >= 18 (Node.js 22 LTS recommended), Python 3 with GTK3 and WebKit2 (`python3-gi`, `gir1.2-webkit2-4.1` or `gir1.2-webkit2-4.0`)
- **Download Engines**: `aria2` (`aria2c`) and `ffmpeg` (bundled or system-installed)

---

## Installation

### Option A: Install via Official Debian Package (.deb) (Recommended)

You can build and install the native `.deb` package directly on Ubuntu or Debian:

```bash
# 1. Build the .deb package
bash scripts/build-deb.sh

# 2. Install using apt (automatically resolves dependencies)
sudo apt install ./dist/downnux-manager_0.0.1_amd64.deb
```

Once installed, DownNux Manager is accessible in your Ubuntu Applications Menu ("Show Applications"), or by running `downnux-gui` in any terminal.

### Option B: Quick Terminal Installer (Developer / Git Clone)

If you are developing or running directly from the source repository:

```bash
# 1. Clone the repository
git clone https://github.com/Nuril09/DownNux-Manager.git
cd DownNux-Manager

# 2. Run the automated installer
bash install.sh
```

The script configures binaries, registers browser manifests, compiles the hybrid engine, and activates the `downnux-daemon` systemd service.

---

## Running the Application

### 1. Launching the Native Desktop GUI

You can launch the native desktop application at any time:

```bash
downnux-gui
```
*(Or click the **DownNux Manager** icon in your desktop app launcher).*

### 2. Command Line Interface (CLI)

The `downnux` CLI command connects to the background daemon and provides full management capabilities:

```bash
# Test connection to daemon and view engine status
downnux ping

# List all current, active, completed, or failed downloads
downnux ls

# Add a download with 8 parallel connections
downnux add "https://releases.ubuntu.com/noble/ubuntu-24.04.1-desktop-amd64.iso" -c 8

# Add a YouTube / online video download
downnux add "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Pause an active download by its task ID prefix
downnux pause 9e18e613

# Resume a paused or interrupted download
downnux resume 9e18e613

# Cancel a download and remove partial files
downnux cancel 9e18e613

# View daemon system information
curl -s http://127.0.0.1:44990/api/sysinfo
```

---

## Browser Extension Setup

To enable automatic download interception and floating video download buttons:

### Chromium-based Browsers (Google Chrome, Brave, Microsoft Edge, Opera)
1. Open `chrome://extensions` or `brave://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the folder:
   `/home/<user>/.../DownNux-Manager/apps/extension`
4. The DownNux status in the sidebar will indicate `Browser Connected`.

### Mozilla Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select the file:
   `/home/<user>/.../DownNux-Manager/apps/extension/manifest.firefox.json`

### Video Sniffing Workflow
When browsing video sites (YouTube, Vimeo, TikTok, etc.):
1. Hover over any active video player.
2. The frosted purple **DownNux · Download** button will appear in the top-right corner.
3. Click the button to select your desired format:
   - **Best Quality (Auto)**: Combines highest video track and audio track via FFmpeg.
   - **Full HD (1080p)**
   - **HD Ready (720p)**
   - **Audio Only (MP3 / M4A)**
4. The download task will immediately appear in your DownNux Manager GUI and CLI.

---

## Directory & File Locations

- **Configuration**: `~/.config/downnux/settings.json`
- **Database (SQLite WAL)**: `~/.local/share/downnux/downnux.db`
- **Runtime Socket & Locks**: `~/.local/state/downnux/daemon.sock`
- **Daemon Logs**: `~/.local/state/downnux/log/daemon.log`
- **Systemd User Units**: `~/.config/systemd/user/downnux-daemon.service`
- **Default Downloads Directory**: `~/Downloads`

---

## Systemd Daemon Management

DownNux Manager is managed as a user-level systemd service:

```bash
# Check daemon service status
systemctl --user status downnux-daemon

# Restart daemon service
systemctl --user restart downnux-daemon

# Stop daemon service
systemctl --user stop downnux-daemon

# View live daemon logs
journalctl --user -u downnux-daemon -f
```

---

## Automated Verification & Tests

To execute the end-to-end test suite (testing HTTP Range splitting, sha256 integrity verification, auto-retry on network drop, and crash recovery):

```bash
npm test
```

---

## License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.  
See the [LICENSE](LICENSE) file for the full license text.

Copyright (C) 2026 CreativeMichiz.
