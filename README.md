# DownNux Manager

DownNux Manager is a high-performance download manager for Linux (Ubuntu/Debian) designed to bring an experience similar to Internet Download Manager (IDM). It features multi-connection segmented downloading, automatic pause/resume/retry, continuous background downloading via a systemd daemon, and seamless browser integration with video sniffing.

Developed by **CreativeMichiz**.

---

## Key Features

- **Multi-Segment Download Engine**: Splits files into multiple parallel HTTP Range connections (default 8, up to 16/32 connections) powered by `aria2`.
- **Independent Background Daemon**: Downloads are processed by a dedicated background service (`systemd --user`). Closing the GUI does not interrupt active downloads.
- **Auto Recovery & Crash Resistance**: Download states and segment progress are preserved in SQLite. If connection drops or the system reboots, downloads resume automatically.
- **Resource Efficient**: Low memory footprint (~35-40 MB total RAM usage when running in background).
- **Browser Integration**: Native integration for Chrome, Brave, Microsoft Edge, and Mozilla Firefox:
  - Automatic download capture with referrer, cookie, and user-agent forwarding.
  - Floating download button on HTML5 video elements.
  - Extension popup displaying detected video and audio streams.
- **Modern Desktop UI & i18n**: Fast interface built with React, Vite, and Tailwind CSS. Supports both English (default) and Indonesian.

---

## Architecture Overview

DownNux Manager consists of four decoupled components:

1. **`apps/daemon`**: The core background service managing queues, SQLite state, and controlling the aria2 engine. Exposes IPC via Unix domain socket (`daemon.sock`).
2. **`apps/gui`**: Desktop interface offering real-time progress bars, connection graphs, task management, and settings.
3. **`apps/native-host`**: Native messaging bridge passing download capture requests and headers from browsers to the daemon.
4. **`apps/extension`**: Manifest V3 extension for Chromium-based browsers (Chrome, Brave, Edge) and Firefox.

---

## Prerequisites

- Linux (Ubuntu 22.04 LTS, 24.04 LTS, 26.04 or compatible Debian-based distribution)
- Node.js >= 22
- `aria2` (`sudo apt install aria2`)
- `ffmpeg` (for stream merging)
- `pnpm` >= 10 (or `npm`)

---

## Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/Nuril09/DownNux-Manager.git
cd DownNux-Manager
```

### 2. Install Dependencies & Build
```bash
pnpm install
# or: npm install
```

### 3. Setup Daemon & Browser Integration
Run the local setup script to build binaries, install the CLI, configure systemd user service, and register browser manifests:
```bash
bash scripts/install-dev.sh
```

To enable autostart on user login:
```bash
systemctl --user enable downnux-daemon
```

---

## Usage

### CLI Commands

You can use the `downnux` CLI command (or `./downnux` from the project root):

- **Add a download**:
  ```bash
  downnux add "https://example.com/file.iso" -c 8
  ```
- **List downloads**:
  ```bash
  downnux ls
  ```
- **Pause a download**:
  ```bash
  downnux pause <id-prefix>
  ```
- **Resume a download**:
  ```bash
  downnux resume <id-prefix>
  ```
- **Cancel a download**:
  ```bash
  downnux cancel <id-prefix>
  ```
- **Daemon health check**:
  ```bash
  downnux ping
  ```

### Running the Desktop GUI

To launch the web-based desktop GUI preview:
```bash
npm run gui
```
Open your browser at `http://localhost:1420`.

### Installing the Browser Extension

- **Chrome / Brave / Microsoft Edge**:
  1. Open `chrome://extensions` or `brave://extensions`.
  2. Enable **Developer mode**.
  3. Click **Load unpacked** and select the directory:
     `apps/extension`
- **Mozilla Firefox**:
  1. Open `about:debugging#/runtime/this-firefox`.
  2. Click **Load Temporary Add-on**.
  3. Select `apps/extension/manifest.firefox.json`.

---

## Testing

Run the full end-to-end test suite against an internal HTTP Range simulation server:
```bash
npm test
```

---

## License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. See the [LICENSE](LICENSE) file for details.

Copyright (C) 2026 CreativeMichiz.

