export interface ReleaseAsset {
  id: string;
  name: string;
  label: string;
  os: "linux" | "windows" | "macos" | "extension";
  format: "deb" | "appimage" | "tar.gz" | "exe" | "zip" | "dmg";
  size: string;
  recommended?: boolean;
  downloadUrl: string;
  instructions: {
    en: string;
    id: string;
  };
}

export const CURRENT_VERSION = "0.0.6";
export const GITHUB_REPO_URL = "https://github.com/Nuril09/DownNux-Manager";
export const RELEASES_PAGE_URL = "https://github.com/Nuril09/DownNux-Manager/releases/tag/v0.0.6";

export interface ChangelogEntry {
  version: string;
  date: string;
  badge?: string;
  title: {
    en: string;
    id: string;
  };
  highlights: {
    en: string[];
    id: string[];
  };
  tagUrl: string;
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: "0.0.6",
    date: "November 2026",
    badge: "Latest Stable",
    title: {
      en: "Self-Contained Standalone Multiplatform Installers",
      id: "Installer Mandiri Multiplatform (Zero Setup)",
    },
    highlights: {
      en: [
        "Windows & macOS Zero-Setup: Bundles the standalone background engine (daemon.mjs), Node.js 22 runtime, aria2c, yt-dlp, and FFmpeg directly into the installers. No external dependencies required.",
        "Silent Engine Auto-Launcher: The Tauri desktop client automatically initializes and monitors the background service with CREATE_NO_WINDOW on Windows (no unwanted terminal prompts).",
        "Native Shell & File Management: Implemented explorer.exe /select on Windows, open -R on macOS, and native folder choosers using PowerShell and AppleScript.",
        "Resilient Localhost IPC: Avoids POSIX domain socket crashes on Windows with automatic port contention fallback and HTTP/WebSocket reconnection.",
        "Idiomatic Storage Paths: Stores configurations and tasks under %APPDATA%, %LOCALAPPDATA%, ~/Library/Application Support, and Linux XDG Base Directory."
      ],
      id: [
        "Windows & macOS Mandiri (Zero Setup): Daemon background (daemon.mjs), runtime Node.js 22, aria2c, yt-dlp, dan FFmpeg kini langsung terbundel ke installer. Tanpa perlu install tools tambahan.",
        "Auto-Launcher Engine Tanpa Jendela: Desktop client Tauri otomatis menyalakan engine di latar belakang saat dibuka, dengan flag CREATE_NO_WINDOW di Windows (tanpa jendela CMD hitam).",
        "Integrasi Native Shell: Buka file/folder dengan explorer.exe /select di Windows, open -R di macOS, serta dialog pemilihan folder native (PowerShell & AppleScript).",
        "IPC Localhost Tahan Gangguan: Mencegah crash socket Unix di Windows dan penanganan bentrok port yang lebih tangguh dengan auto-reconnect.",
        "Penyimpanan Sesuai Standar OS: Konfigurasi dan database tersimpan rapi di %APPDATA%, %LOCALAPPDATA%, ~/Library/Application Support, dan direktori XDG."
      ]
    },
    tagUrl: "https://github.com/Nuril09/DownNux-Manager/releases/tag/v0.0.6"
  },
  {
    version: "0.0.5",
    date: "November 2026",
    title: {
      en: "BitTorrent Core & Enhanced Video Sniffer",
      id: "Mesin BitTorrent & Penyempurnaan Sniffer Video",
    },
    highlights: {
      en: [
        "Native BitTorrent & Magnet Support: Import .torrent files and Magnet links with high-speed DHT and tracker peer exchange.",
        "Standalone Floating Inspector: IDM-style detached progress window featuring 32-segment real-time chunk visualization and connection threads.",
        "H.264 Safe Video Muxing: Automatic transcoding ensuring WhatsApp and Gmail video playback compatibility.",
        "Dedicated Paused Task Queue: Quickly resume interrupted downloads from the Paused library."
      ],
      id: [
        "Dukungan Penuh BitTorrent & Magnet: Unduh file .torrent dan Magnet link dengan pertukaran peer DHT berkecepatan tinggi.",
        "Floating Inspector Melayang: Jendela pemantau progres bergaya IDM dengan peta alokasi 32-chunk dan monitor thread.",
        "Muxing Video H.264 Safe: Otomatis konversi video agar selalu kompatibel diputar di WhatsApp dan Gmail.",
        "Antrean Khusus Task Dijeda: Akses cepat unduhan yang ditunda lewat filter Paused."
      ]
    },
    tagUrl: "https://github.com/Nuril09/DownNux-Manager/releases/tag/v0.0.5"
  }
];

export const RELEASE_ASSETS: ReleaseAsset[] = [
  // Linux Packages
  {
    id: "linux-deb",
    name: "DownNux.Manager_0.0.6_amd64.deb",
    label: "Debian / Ubuntu Package (.deb)",
    os: "linux",
    format: "deb",
    size: "53 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.6/DownNux.Manager_0.0.6_amd64.deb",
    instructions: {
      en: "sudo apt install ./DownNux.Manager_0.0.6_amd64.deb",
      id: "sudo apt install ./DownNux.Manager_0.0.6_amd64.deb",
    },
  },
  {
    id: "linux-appimage",
    name: "DownNux.Manager_0.0.6_amd64.AppImage",
    label: "Universal Linux AppImage",
    os: "linux",
    format: "appimage",
    size: "180 MB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.6/DownNux.Manager_0.0.6_amd64.AppImage",
    instructions: {
      en: "chmod +x DownNux.Manager_0.0.6_amd64.AppImage && ./DownNux.Manager_0.0.6_amd64.AppImage",
      id: "chmod +x DownNux.Manager_0.0.6_amd64.AppImage && ./DownNux.Manager_0.0.6_amd64.AppImage",
    },
  },
  {
    id: "linux-tar",
    name: "downnux-manager_0.0.6_linux_x64.tar.gz",
    label: "Linux Portable (.tar.gz)",
    os: "linux",
    format: "tar.gz",
    size: "2.1 MB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.6/downnux-manager_0.0.6_linux_x64.tar.gz",
    instructions: {
      en: "tar -xzf downnux-manager_0.0.6_linux_x64.tar.gz && cd downnux-manager_0.0.6_linux_x64 && bash start-downnux.sh",
      id: "tar -xzf downnux-manager_0.0.6_linux_x64.tar.gz && cd downnux-manager_0.0.6_linux_x64 && bash start-downnux.sh",
    },
  },

  // Windows Packages
  {
    id: "windows-exe",
    name: "DownNux.Manager_0.0.6_x64-setup.exe",
    label: "Windows NSIS Installer (.exe)",
    os: "windows",
    format: "exe",
    size: "99 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.6/DownNux.Manager_0.0.6_x64-setup.exe",
    instructions: {
      en: "Double-click DownNux.Manager_0.0.6_x64-setup.exe to install. Includes full embedded engine with zero setup.",
      id: "Klik dua kali file DownNux.Manager_0.0.6_x64-setup.exe. Seluruh engine sudah terbundel otomatis tanpa setup.",
    },
  },
  {
    id: "windows-zip",
    name: "downnux-manager_0.0.6_windows_x64.zip",
    label: "Windows Portable Archive (.zip)",
    os: "windows",
    format: "zip",
    size: "450 KB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.6/downnux-manager_0.0.6_windows_x64.zip",
    instructions: {
      en: "Extract the zip archive and launch start-downnux.bat",
      id: "Ekstrak arsip zip lalu jalankan start-downnux.bat",
    },
  },

  // macOS Packages
  {
    id: "macos-dmg",
    name: "DownNux.Manager_0.0.6_aarch64.dmg",
    label: "macOS Disk Image (.dmg)",
    os: "macos",
    format: "dmg",
    size: "80 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.6/DownNux.Manager_0.0.6_aarch64.dmg",
    instructions: {
      en: "Open .dmg and drag DownNux Manager into your Applications folder. Ready to use out of the box.",
      id: "Buka file .dmg dan seret DownNux Manager ke folder Applications. Langsung siap dipakai tanpa setup.",
    },
  },
  {
    id: "macos-zip",
    name: "downnux-manager_0.0.6_macos_universal.zip",
    label: "macOS Portable Bundle (.zip)",
    os: "macos",
    format: "zip",
    size: "450 KB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.6/downnux-manager_0.0.6_macos_universal.zip",
    instructions: {
      en: "Extract the zip archive and run start-downnux.command",
      id: "Ekstrak file zip lalu jalankan start-downnux.command",
    },
  },

  // Browser Extension
  {
    id: "extension-zip",
    name: "downnux-extension_0.0.6.zip",
    label: "Browser Extension (Chrome, Brave, Edge, Firefox)",
    os: "extension",
    format: "zip",
    size: "140 KB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.6/downnux-extension_0.0.6.zip",
    instructions: {
      en: "Unpack zip, open chrome://extensions, enable Developer Mode, and click Load unpacked.",
      id: "Ekstrak zip, buka chrome://extensions, aktifkan Mode Pengembang, dan klik Muat yang belum dibongkar.",
    },
  },
];
