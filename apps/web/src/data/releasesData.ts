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

export const CURRENT_VERSION = "0.0.5";
export const GITHUB_REPO_URL = "https://github.com/Nuril09/DownNux-Manager";
export const RELEASES_PAGE_URL = "https://github.com/Nuril09/DownNux-Manager/releases/tag/v0.0.5";

export const RELEASE_ASSETS: ReleaseAsset[] = [
  // Linux Packages
  {
    id: "linux-deb",
    name: "downnux-manager_0.0.5_amd64.deb",
    label: "Debian / Ubuntu Package (.deb)",
    os: "linux",
    format: "deb",
    size: "26 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/downnux-manager_0.0.5_amd64.deb",
    instructions: {
      en: "sudo apt install ./downnux-manager_0.0.5_amd64.deb",
      id: "sudo apt install ./downnux-manager_0.0.5_amd64.deb",
    },
  },
  {
    id: "linux-appimage",
    name: "DownNux.Manager_0.0.5_amd64.AppImage",
    label: "Universal Linux AppImage",
    os: "linux",
    format: "appimage",
    size: "27 MB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/DownNux.Manager_0.0.5_amd64.AppImage",
    instructions: {
      en: "chmod +x DownNux.Manager_0.0.5_amd64.AppImage && ./DownNux.Manager_0.0.5_amd64.AppImage",
      id: "chmod +x DownNux.Manager_0.0.5_amd64.AppImage && ./DownNux.Manager_0.0.5_amd64.AppImage",
    },
  },
  {
    id: "linux-tar",
    name: "downnux-manager_0.0.5_linux_x64.tar.gz",
    label: "Linux Portable (.tar.gz)",
    os: "linux",
    format: "tar.gz",
    size: "1.7 MB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/downnux-manager_0.0.5_linux_x64.tar.gz",
    instructions: {
      en: "tar -xzf downnux-manager_0.0.5_linux_x64.tar.gz && cd downnux-manager_0.0.5_linux_x64 && bash start-downnux.sh",
      id: "tar -xzf downnux-manager_0.0.5_linux_x64.tar.gz && cd downnux-manager_0.0.5_linux_x64 && bash start-downnux.sh",
    },
  },

  // Windows Packages
  {
    id: "windows-exe",
    name: "DownNux.Manager_0.0.5_x64-setup.exe",
    label: "Windows NSIS Installer (.exe)",
    os: "windows",
    format: "exe",
    size: "15 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/DownNux.Manager_0.0.5_x64-setup.exe",
    instructions: {
      en: "Double-click DownNux.Manager_0.0.5_x64-setup.exe to install on Windows 10/11.",
      id: "Klik dua kali file DownNux.Manager_0.0.5_x64-setup.exe untuk memasang di Windows 10/11.",
    },
  },
  {
    id: "windows-zip",
    name: "downnux-manager_0.0.5_windows_x64.zip",
    label: "Windows Portable Archive (.zip)",
    os: "windows",
    format: "zip",
    size: "440 KB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/downnux-manager_0.0.5_windows_x64.zip",
    instructions: {
      en: "Extract the zip archive and launch start-downnux.bat",
      id: "Ekstrak arsip zip lalu jalankan start-downnux.bat",
    },
  },

  // macOS Packages
  {
    id: "macos-dmg",
    name: "DownNux.Manager_0.0.5_aarch64.dmg",
    label: "macOS Disk Image (.dmg)",
    os: "macos",
    format: "dmg",
    size: "14 MB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/DownNux.Manager_0.0.5_aarch64.dmg",
    instructions: {
      en: "Open .dmg and drag DownNux Manager into your Applications folder.",
      id: "Buka file .dmg dan seret DownNux Manager ke folder Applications.",
    },
  },
  {
    id: "macos-zip",
    name: "downnux-manager_0.0.5_macos_universal.zip",
    label: "macOS Portable Bundle (.zip)",
    os: "macos",
    format: "zip",
    size: "440 KB",
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/downnux-manager_0.0.5_macos_universal.zip",
    instructions: {
      en: "Extract the zip archive and run start-downnux.command",
      id: "Ekstrak file zip lalu jalankan start-downnux.command",
    },
  },

  // Browser Extension
  {
    id: "extension-zip",
    name: "downnux-extension_0.0.5.zip",
    label: "Browser Extension (Chrome, Brave, Edge, Firefox)",
    os: "extension",
    format: "zip",
    size: "135 KB",
    recommended: true,
    downloadUrl: "https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/downnux-extension_0.0.5.zip",
    instructions: {
      en: "Unpack zip, open chrome://extensions, enable Developer Mode, and click Load unpacked.",
      id: "Ekstrak zip, buka chrome://extensions, aktifkan Mode Pengembang, dan klik Muat yang belum dibongkar.",
    },
  },
];
