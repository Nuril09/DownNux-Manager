import React, { useState } from "react";
import { Terminal, Copy, Check, Chrome, AppWindow, Apple } from "lucide-react";

interface InstallGuideProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function InstallGuide({ theme, lang }: InstallGuideProps) {
  const [activeOsTab, setActiveOsTab] = useState<"linux" | "windows" | "macos" | "browser">("linux");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section id="install" className="py-20 border-t transition-colors"
      style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.16)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] mb-3">
            <Terminal className="w-3.5 h-3.5" />
            <span>Setup & Deployment</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-4xl">
            {lang === "en" ? "Installation & Extension Setup" : "Panduan Instalasi & Ekstensi Browser"}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#4b5563] dark:text-[#a0a8c2]">
            {lang === "en"
              ? "Simple step-by-step setup guides for Linux, Windows, macOS, and browser integrations."
              : "Panduan praktis langkah demi langkah untuk Linux, Windows, macOS, serta integrasi browser."}
          </p>
        </div>

        {/* Operating System & Browser Tab Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: "linux", label: "Ubuntu / Linux", icon: Terminal },
            { id: "windows", label: "Windows 10 / 11", icon: AppWindow },
            { id: "macos", label: "macOS", icon: Apple },
            { id: "browser", label: "Browser Extension", icon: Chrome },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveOsTab(item.id as any)}
                className={`px-4 py-2.5 rounded-[8px] text-xs font-bold transition-all flex items-center space-x-2 ${
                  activeOsTab === item.id
                    ? "bg-[#6554c0] text-white shadow-md shadow-[#6554c0]/25"
                    : "bg-black/5 dark:bg-white/5 text-[#4b5563] dark:text-[#c4cbde] hover:bg-black/10 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div className="max-w-3xl mx-auto rounded-[12px] p-6 sm:p-8 border shadow-lg transition-all"
          style={{
            backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(18, 20, 36, 0.88)",
            borderColor: theme === "light" ? "#dfe3f0" : "rgba(139, 92, 246, 0.25)",
          }}
        >
          {/* 1. Linux Tab */}
          {activeOsTab === "linux" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                  {lang === "en" ? "Option A: Debian / Ubuntu (.deb Package)" : "Opsi A: Paket Debian / Ubuntu (.deb)"}
                </h3>
                <p className="text-xs text-[#6b7280] dark:text-[#9ea4b5] mt-1">
                  {lang === "en"
                    ? "Recommended. Installs downnux-gui, the background daemon user service, and desktop menu shortcuts."
                    : "Direkomendasikan. Memasang downnux-gui, layanan daemon background systemd, dan pintasan desktop."}
                </p>
                
                <div className="mt-3 relative rounded-[8px] bg-black/90 p-4 font-mono text-xs text-white overflow-x-auto">
                  <div className="text-[#9ca3af] mb-1"># 1. Download and install deb package</div>
                  <div className="text-emerald-400">wget https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/downnux-manager_0.0.5_amd64.deb</div>
                  <div className="text-emerald-400">sudo apt install ./downnux-manager_0.0.5_amd64.deb</div>
                  
                  <button
                    type="button"
                    onClick={() => handleCopy("wget https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/downnux-manager_0.0.5_amd64.deb\nsudo apt install ./downnux-manager_0.0.5_amd64.deb", "deb-cmd")}
                    className="absolute top-3 right-3 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs"
                    aria-label="Copy snippet"
                  >
                    {copiedCode === "deb-cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                  {lang === "en" ? "Option B: Universal AppImage" : "Opsi B: Universal AppImage"}
                </h3>
                <p className="text-xs text-[#6b7280] dark:text-[#9ea4b5] mt-1">
                  {lang === "en"
                    ? "Single executable file for Fedora, Arch, OpenSUSE, and any Linux distribution."
                    : "File tunggal siap jalan untuk Fedora, Arch, OpenSUSE, dan semua distro Linux."}
                </p>
                
                <div className="mt-3 relative rounded-[8px] bg-black/90 p-4 font-mono text-xs text-white overflow-x-auto">
                  <div className="text-emerald-400">chmod +x DownNux.Manager_0.0.5_amd64.AppImage</div>
                  <div className="text-emerald-400">./DownNux.Manager_0.0.5_amd64.AppImage</div>
                  
                  <button
                    type="button"
                    onClick={() => handleCopy("chmod +x DownNux.Manager_0.0.5_amd64.AppImage && ./DownNux.Manager_0.0.5_amd64.AppImage", "appimage-cmd")}
                    className="absolute top-3 right-3 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs"
                    aria-label="Copy snippet"
                  >
                    {copiedCode === "appimage-cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Windows Tab */}
          {activeOsTab === "windows" && (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                {lang === "en" ? "Windows Setup Guide (.exe Installer)" : "Panduan Instalasi Windows (.exe Installer)"}
              </h3>
              <ol className="space-y-3 text-xs sm:text-sm text-[#374151] dark:text-[#d1d5db] list-decimal list-inside">
                <li>
                  {lang === "en" ? "Download " : "Unduh "}
                  <a href="https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/DownNux.Manager_0.0.5_x64-setup.exe" className="font-mono text-[#6554c0] dark:text-[#a79be8] font-bold underline">
                    DownNux.Manager_0.0.5_x64-setup.exe
                  </a>
                  {lang === "en" ? " from GitHub Releases." : " dari halaman GitHub Releases."}
                </li>
                <li>
                  {lang === "en"
                    ? "Double-click the installer and follow the setup wizard prompts."
                    : "Klik dua kali file installer dan ikuti petunjuk wizard di layar."}
                </li>
                <li>
                  {lang === "en"
                    ? "Once finished, launch DownNux Manager from your Start Menu or Desktop shortcut."
                    : "Setelah selesai, buka DownNux Manager dari Start Menu atau ikon Desktop."}
                </li>
                <li>
                  {lang === "en"
                    ? "For portable use without administrator privileges, download downnux-manager_0.0.5_windows_x64.zip, extract it, and run start-downnux.bat."
                    : "Untuk versi portabel tanpa hak akses admin, unduh downnux-manager_0.0.5_windows_x64.zip, ekstrak, lalu jalankan start-downnux.bat."}
                </li>
              </ol>
            </div>
          )}

          {/* 3. macOS Tab */}
          {activeOsTab === "macos" && (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                {lang === "en" ? "macOS Installation (.dmg Disk Image)" : "Panduan Instalasi macOS (.dmg Disk Image)"}
              </h3>
              <ol className="space-y-3 text-xs sm:text-sm text-[#374151] dark:text-[#d1d5db] list-decimal list-inside">
                <li>
                  {lang === "en" ? "Download " : "Unduh "}
                  <a href="https://github.com/Nuril09/DownNux-Manager/releases/download/v0.0.5/DownNux.Manager_0.0.5_aarch64.dmg" className="font-mono text-[#6554c0] dark:text-[#a79be8] font-bold underline">
                    DownNux.Manager_0.0.5_aarch64.dmg
                  </a>
                  {lang === "en" ? " from GitHub Releases." : " dari halaman rilis GitHub."}
                </li>
                <li>
                  {lang === "en"
                    ? "Open the .dmg file and drag the DownNux Manager application icon into your Applications folder."
                    : "Buka file .dmg lalu seret ikon DownNux Manager ke dalam folder Applications."}
                </li>
                <li>
                  {lang === "en"
                    ? "On first launch, if macOS Gatekeeper prompts an unverified developer warning, open System Settings > Privacy & Security, scroll down, and click 'Open Anyway'."
                    : "Saat pertama kali dibuka, jika muncul peringatan macOS Gatekeeper, buka System Settings > Privacy & Security lalu klik 'Open Anyway'."}
                </li>
              </ol>
            </div>
          )}

          {/* 4. Browser Integration Tab */}
          {activeOsTab === "browser" && (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                {lang === "en" ? "Browser Integration Setup" : "Cara Memasang Ekstensi Browser"}
              </h3>
              <p className="text-xs text-[#6b7280] dark:text-[#9ea4b5]">
                {lang === "en"
                  ? "The extension relays browser downloads with original session cookies and injects download buttons on video streaming players."
                  : "Ekstensi meneruskan unduhan dari browser beserta cookie sesi asli dan menambahkan tombol unduh pada pemutar video."}
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-3.5 rounded-[8px] bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5">
                  <div className="font-bold text-xs text-[#111827] dark:text-white flex items-center space-x-1.5 mb-1.5">
                    <Chrome className="w-4 h-4 text-[#6554c0]" />
                    <span>Google Chrome / Brave / Microsoft Edge</span>
                  </div>
                  <ol className="text-xs text-[#4b5563] dark:text-[#cbd5e1] space-y-1 list-decimal list-inside">
                    <li>{lang === "en" ? "Download and unzip downnux-extension_0.0.5.zip." : "Unduh dan ekstrak file downnux-extension_0.0.5.zip."}</li>
                    <li>{lang === "en" ? "Open chrome://extensions or brave://extensions in your browser." : "Buka chrome://extensions atau brave://extensions di browser Anda."}</li>
                    <li>{lang === "en" ? "Enable Developer Mode (toggle in top-right corner)." : "Aktifkan Developer mode (toggle di pojok kanan atas)."}</li>
                    <li>{lang === "en" ? "Click 'Load unpacked' and select the unzipped extension directory." : "Klik 'Load unpacked' lalu pilih folder ekstensi yang sudah diekstrak."}</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-[8px] bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5">
                  <div className="font-bold text-xs text-[#111827] dark:text-white flex items-center space-x-1.5 mb-1.5">
                    <span>Mozilla Firefox</span>
                  </div>
                  <ol className="text-xs text-[#4b5563] dark:text-[#cbd5e1] space-y-1 list-decimal list-inside">
                    <li>{lang === "en" ? "Open about:debugging#/runtime/this-firefox." : "Buka about:debugging#/runtime/this-firefox."}</li>
                    <li>{lang === "en" ? "Click 'Load Temporary Add-on...' and choose manifest.firefox.json inside the extension folder." : "Klik 'Load Temporary Add-on...' lalu pilih manifest.firefox.json di folder ekstensi."}</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}

