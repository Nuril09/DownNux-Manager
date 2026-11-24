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

export const CURRENT_VERSION = "0.0.8";
export const GITHUB_REPO_URL = "https://github.com/Nuril09/DownNux-Manager";
export const RELEASES_PAGE_URL = "https://github.com/Nuril09/DownNux-Manager/releases/tag/v0.0.8";

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
    version: "0.0.8",
    date: "November 2026",
    badge: "Latest Stable",
    title: {
      en: "Spotify Audio Extraction, Extension v0.0.8 & Live Size Estimates",
      id: "Unduh Audio Spotify, Ekstensi v0.0.8 & Estimasi Ukuran Live",
    },
    highlights: {
      en: [
        "Spotify Track & Episode Audio Downloads: Paste any Spotify track or episode link to automatically resolve title, artist, duration, and cover art, match the best non-DRM audio source via yt-dlp, and save CBR MP3 (320/192/128 kbps) with embedded ID3 tags and album art.",
        "SoundCloud & Bandcamp Audio Support: Automatically routes audio platforms to MP3 extraction and saves directly into your Music category folder.",
        "Browser Extension v0.0.8: Added a floating Spotify Web Player MP3 button (supports track pages & Now Playing bar), popup quick-download cards, and automatic localhost HTTP RPC fallback for Windows, macOS, and Linux.",
        "Live Format Size Estimation & Native Inspector: Dynamically recalculates estimated file size as you switch resolutions or MP3 bitrates, paired with an async native Tauri floating inspector window.",
        "Self-Contained Linux Packaging: Updated .deb and portable Linux packagers to bundle a standalone Node 22 daemon without external node_modules requirements."
      ],
      id: [
        "Unduh Audio Lagu & Episode Spotify: Tempel link lagu atau episode Spotify untuk otomatis mengambil judul, artis, durasi, dan cover album, mencocokkan sumber audio terbaik via yt-dlp, lalu menyimpannya sebagai MP3 CBR (320/192/128 kbps) lengkap dengan tag ID3 dan cover art.",
        "Dukungan Audio SoundCloud & Bandcamp: Otomatis merutekan situs musik ke ekstraksi MP3 dan menyimpan langsung ke folder kategori Music.",
        "Ekstensi Browser v0.0.8: Menambahkan tombol melayang MP3 di Spotify Web Player (mendukung halaman track & bar Now Playing), kartu quick-download di popup, serta fallback HTTP RPC otomatis untuk Windows, macOS, dan Linux.",
        "Estimasi Ukuran Live & Inspector Native: Estimasi ukuran file langsung berubah saat memilih resolusi video atau bitrate MP3, didukung jendela inspector Tauri async yang responsif.",
        "Packaging Linux Mandiri: Skrip build .deb dan Linux portable kini membundel daemon Node 22 secara mandiri tanpa ketergantungan node_modules eksternal."
      ]
    },
    tagUrl: "https://github.com/Nuril09/DownNux-Manager/releases/tag/v0.0.8"
  },
  {
    version: "0.0.7",
    date: "November 2026",
    title: {
      en: "Windows Runtime & WebView2 Stability Fixes",
      id: "Perbaikan Runtime Windows & Stabilitas WebView2",
    },
    highlights: {
      en: [
        "Fixed Windows UNC Path Launch Crash: Stripped extended-length \\\\?\\ resource prefixes when launching bundled node.exe and aria2c.exe so ESM daemon loading works cleanly across all Windows drives.",
        "Bundled Visual C++ Runtime DLLs: Included vcruntime140.dll, vcruntime140_1.dll, and msvcp140.dll directly inside the Windows installer for clean Windows 10/11 PCs.",
        "Edge WebView2 PNA CORS & Window Transparency Fix: Added Access-Control-Allow-Private-Network headers for http://tauri.localhost IPC and disabled forced transparent WebView composition glitches.",
        "Cross-Platform Notifications & Process Hygiene: Replaced raw Linux notify-send calls with safe OS dispatch and added windowsHide flags across yt-dlp, aria2c, FFmpeg, and sleep/shutdown actions.",
        "Boot Diagnostics & Health Recovery: Added /api/health engine readiness telemetry, persistent daemon-boot.log diagnostics, and automatic GUI startup sync retries."
      ],
      id: [
        "Perbaikan Crash UNC Path di Windows: Menghapus prefix extended-length \\\\?\\ saat menjalankan node.exe dan aria2c.exe agar module ESM daemon berjalan normal di semua drive Windows.",
        "Bundel DLL Visual C++ Runtime: Menyertakan vcruntime140.dll, vcruntime140_1.dll, dan msvcp140.dll langsung di installer Windows untuk PC Windows 10/11 bersih.",
        "Perbaikan CORS Private Network WebView2 & Transparansi Window: Menambahkan header Access-Control-Allow-Private-Network untuk http://tauri.localhost serta menonaktifkan transparansi window yang memicu blank render.",
        "Higienitas Proses & Notifikasi Lintas OS: Menghindari crash notify-send di Windows/macOS serta menyembunyikan jendela konsol dengan windowsHide pada semua child process.",
        "Diagnostik Boot & Pemulihan Status Engine: Menambahkan endpoint /api/health, log startup daemon-boot.log, dan sinkronisasi ulang otomatis saat daemon selesai booting."
      ]
    },
    tagUrl: "https://github.com/Nuril09/DownNux-Manager/releases/tag/v0.0.7"
  },
  {
    version: "0.0.6",
    date: "November 2026",
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
    name: "DownNux.Manager_0.0.8_amd64.deb",
    label: "Debian / Ubuntu Package (.deb)",
    os: "linux",
    format: "deb",
    size: "52.7 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.8/DownNux.Manager_0.0.8_amd64.deb",
    instructions: {
      en: "sudo apt install ./DownNux.Manager_0.0.8_amd64.deb",
      id: "sudo apt install ./DownNux.Manager_0.0.8_amd64.deb",
    },
  },
  {
    id: "linux-appimage",
    name: "DownNux.Manager_0.0.8_amd64.AppImage",
    label: "Universal Linux AppImage",
    os: "linux",
    format: "appimage",
    size: "180 MB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.8/DownNux.Manager_0.0.8_amd64.AppImage",
    instructions: {
      en: "chmod +x DownNux.Manager_0.0.8_amd64.AppImage && ./DownNux.Manager_0.0.8_amd64.AppImage",
      id: "chmod +x DownNux.Manager_0.0.8_amd64.AppImage && ./DownNux.Manager_0.0.8_amd64.AppImage",
    },
  },
  {
    id: "linux-tar",
    name: "downnux-manager_0.0.8_linux_x64.tar.gz",
    label: "Linux Portable (.tar.gz)",
    os: "linux",
    format: "tar.gz",
    size: "563 KB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.8/downnux-manager_0.0.8_linux_x64.tar.gz",
    instructions: {
      en: "tar -xzf downnux-manager_0.0.8_linux_x64.tar.gz && cd downnux-manager_0.0.8_linux_x64 && bash start-downnux.sh",
      id: "tar -xzf downnux-manager_0.0.8_linux_x64.tar.gz && cd downnux-manager_0.0.8_linux_x64 && bash start-downnux.sh",
    },
  },

  // Windows Packages
  {
    id: "windows-exe",
    name: "DownNux.Manager_0.0.8_x64-setup.exe",
    label: "Windows NSIS Installer (.exe)",
    os: "windows",
    format: "exe",
    size: "99.7 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.8/DownNux.Manager_0.0.8_x64-setup.exe",
    instructions: {
      en: "Double-click DownNux.Manager_0.0.8_x64-setup.exe to install. Includes embedded engine and VC++ runtime DLLs with zero setup.",
      id: "Klik dua kali file DownNux.Manager_0.0.8_x64-setup.exe. Engine dan DLL runtime Visual C++ sudah terbundel otomatis tanpa setup.",
    },
  },
  {
    id: "windows-zip",
    name: "downnux-manager_0.0.8_windows_x64.zip",
    label: "Windows Portable Archive (.zip)",
    os: "windows",
    format: "zip",
    size: "433 KB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.8/downnux-manager_0.0.8_windows_x64.zip",
    instructions: {
      en: "Extract the zip archive and launch start-downnux.bat",
      id: "Ekstrak arsip zip lalu jalankan start-downnux.bat",
    },
  },

  // macOS Packages
  {
    id: "macos-dmg",
    name: "DownNux.Manager_0.0.8_aarch64.dmg",
    label: "macOS Disk Image (.dmg)",
    os: "macos",
    format: "dmg",
    size: "79.9 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.8/DownNux.Manager_0.0.8_aarch64.dmg",
    instructions: {
      en: "Open .dmg and drag DownNux Manager into your Applications folder. Ready to use out of the box.",
      id: "Buka file .dmg dan seret DownNux Manager ke folder Applications. Langsung siap dipakai tanpa setup.",
    },
  },
  {
    id: "macos-zip",
    name: "downnux-manager_0.0.8_macos_universal.zip",
    label: "macOS Portable Bundle (.zip)",
    os: "macos",
    format: "zip",
    size: "434 KB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.8/downnux-manager_0.0.8_macos_universal.zip",
    instructions: {
      en: "Extract the zip archive and run start-downnux.command",
      id: "Ekstrak file zip lalu jalankan start-downnux.command",
    },
  },

  // Browser Extension
  {
    id: "extension-zip",
    name: "downnux-extension_0.0.8.zip",
    label: "Browser Extension (Chrome, Brave, Edge, Firefox)",
    os: "extension",
    format: "zip",
    size: "139 KB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.8/downnux-extension_0.0.8.zip",
    instructions: {
      en: "Unpack zip, open chrome://extensions, enable Developer Mode, and click Load unpacked.",
      id: "Ekstrak zip, buka chrome://extensions, aktifkan Mode Pengembang, dan klik Muat yang belum dibongkar.",
    },
  },
];
