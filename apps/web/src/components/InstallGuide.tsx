import React, { useState } from "react";
import { Terminal, Copy, Check, Chrome, AppWindow, Apple } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
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
        </motion.div>

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
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveOsTab(item.id as any)}
                className={`px-4 py-2.5 rounded-[8px] text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeOsTab === item.id
                    ? "bg-[#6554c0] text-white shadow-md shadow-[#6554c0]/25"
                    : "bg-black/5 dark:bg-white/5 text-[#4b5563] dark:text-[#c4cbde] hover:bg-black/10 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Content Box with Smooth AnimatePresence */}
        <div className="max-w-3xl mx-auto rounded-[12px] p-6 sm:p-8 border shadow-lg transition-all"
          style={{
            backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(18, 20, 36, 0.88)",
            borderColor: theme === "light" ? "#dfe3f0" : "rgba(139, 92, 246, 0.25)",
          }}
        >
          <AnimatePresence mode="wait">
            {activeOsTab === "linux" && (
              <motion.div
                key="linux"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
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
                      className="absolute top-3 right-3 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
                      aria-label="Copy snippet"
                    >
                      {copiedCode === "deb-cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-black/5 dark:border-white/5">
                  <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                    {lang === "en" ? "Option B: Standalone Portable AppImage" : "Opsi B: Portable AppImage"}
                  </h3>
                  <p className="text-xs text-[#6b7280] dark:text-[#9ea4b5] mt-1">
                    {lang === "en"
                      ? "Runs on Fedora, Arch, openSUSE, and any glibc Linux distribution without installation."
                      : "Berjalan di Fedora, Arch, openSUSE, dan distribusi Linux lainnya tanpa proses instalasi."}
                  </p>
                  
                  <div className="mt-3 relative rounded-[8px] bg-black/90 p-4 font-mono text-xs text-white overflow-x-auto">
                    <div className="text-emerald-400">chmod +x DownNux-Manager_0.0.5_x86_64.AppImage</div>
                    <div className="text-emerald-400">./DownNux-Manager_0.0.5_x86_64.AppImage</div>
                    
                    <button
                      type="button"
                      onClick={() => handleCopy("chmod +x DownNux-Manager_0.0.5_x86_64.AppImage\n./DownNux-Manager_0.0.5_x86_64.AppImage", "appimage-cmd")}
                      className="absolute top-3 right-3 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
                      aria-label="Copy snippet"
                    >
                      {copiedCode === "appimage-cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeOsTab === "windows" && (
              <motion.div
                key="windows"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                  Windows 10 / 11 (64-bit)
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-[#4b5563] dark:text-[#a0a8c2] leading-relaxed">
                  <li>
                    {lang === "en" ? "Download " : "Unduh "}
                    <code className="text-[#6554c0] dark:text-[#a79be8] font-bold">DownNux-Manager_0.0.5_x64-setup.exe</code>
                  </li>
                  <li>
                    {lang === "en"
                      ? "Double-click the installer and follow the setup wizard."
                      : "Klik dua kali installer dan ikuti petunjuk wizard instalasi."}
                  </li>
                  <li>
                    {lang === "en"
                      ? "DownNux background service starts automatically with Windows and sits quietly in the system tray."
                      : "Layanan latar belakang DownNux akan otomatis aktif bersama Windows dan siaga di system tray."}
                  </li>
                </ol>
              </motion.div>
            )}

            {activeOsTab === "macos" && (
              <motion.div
                key="macos"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                  macOS (Apple Silicon & Intel)
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-[#4b5563] dark:text-[#a0a8c2] leading-relaxed">
                  <li>
                    {lang === "en" ? "Download " : "Unduh "}
                    <code className="text-[#6554c0] dark:text-[#a79be8] font-bold">DownNux-Manager_0.0.5_aarch64.dmg</code>
                  </li>
                  <li>
                    {lang === "en"
                      ? "Open the DMG disk image and drag DownNux Manager into your Applications folder."
                      : "Buka file DMG dan tarik ikon DownNux Manager ke dalam folder Applications."}
                  </li>
                  <li>
                    {lang === "en"
                      ? "Launch from Launchpad or Spotlight. Daemon registers as a LaunchAgent."
                      : "Buka via Launchpad atau Spotlight. Daemon akan terdaftar sebagai LaunchAgent otomatis."}
                  </li>
                </ol>
              </motion.div>
            )}

            {activeOsTab === "browser" && (
              <motion.div
                key="browser"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <h3 className="text-lg font-bold text-[#111827] dark:text-white">
                  Chrome, Brave, Edge & Firefox Extension Setup
                </h3>
                <p className="text-xs text-[#4b5563] dark:text-[#a0a8c2] leading-relaxed">
                  {lang === "en"
                    ? "The DownNux browser extension automatically catches browser download links and sends them to the local DownNux daemon at port 3820."
                    : "Ekstensi browser DownNux otomatis mencegat tautan unduhan dan mengirimkannya ke daemon lokal DownNux pada port 3820."}
                </p>

                <div className="space-y-3">
                  <div className="font-semibold text-xs text-[#111827] dark:text-white">
                    {lang === "en" ? "How to load unpacked extension in Chromium browsers:" : "Cara pasang ekstensi di Chrome / Brave / Edge:"}
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#4b5563] dark:text-[#a0a8c2]">
                    <li>{lang === "en" ? "Download and unzip downnux-extension_0.0.5.zip." : "Unduh dan ekstrak file downnux-extension_0.0.5.zip."}</li>
                    <li>{lang === "en" ? "Navigate to chrome://extensions in your URL bar." : "Buka chrome://extensions pada browser kamu."}</li>
                    <li>{lang === "en" ? "Toggle Developer mode switch in the top-right corner." : "Aktifkan sakelar Developer mode di pojok kanan atas."}</li>
                    <li>{lang === "en" ? "Click Load unpacked and select the unzipped downnux-extension folder." : "Klik Load unpacked dan pilih folder ekstensi yang sudah diekstrak."}</li>
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
