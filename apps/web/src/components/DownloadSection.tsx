import React, { useState } from "react";
import { Download, ExternalLink, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RELEASE_ASSETS, GITHUB_REPO_URL, CURRENT_VERSION } from "../data/releasesData";

interface DownloadSectionProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function DownloadSection({ theme, lang }: DownloadSectionProps) {
  const [activeTab, setActiveTab] = useState<"all" | "linux" | "windows" | "macos" | "extension">("all");

  const filteredAssets =
    activeTab === "all"
      ? RELEASE_ASSETS
      : RELEASE_ASSETS.filter((a) => a.os === activeTab);

  return (
    <section id="downloads" className="py-20 border-t transition-colors"
      style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.16)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] mb-3">
            <Download className="w-3.5 h-3.5" />
            <span>Official Binaries · v{CURRENT_VERSION}</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-4xl">
            {lang === "en" ? "Download DownNux for Your OS" : "Unduh DownNux Sesuai Sistem Operasi"}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#4b5563] dark:text-[#a0a8c2]">
            {lang === "en"
              ? "All packages are compiled directly from source and distributed via GitHub Releases. Free, open source, and ad-free."
              : "Semua paket dibangun langsung dari source code dan dirilis via GitHub Releases. Gratis, open-source, dan bebas iklan."}
          </p>
        </motion.div>

        {/* Platform Selector Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: "all", label: lang === "en" ? "All Packages" : "Semua Paket" },
            { id: "linux", label: "Linux (.deb / AppImage)" },
            { id: "windows", label: "Windows (.exe / .zip)" },
            { id: "macos", label: "macOS (.dmg / .zip)" },
            { id: "extension", label: "Browser Extension" },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#6554c0] text-white shadow-md shadow-[#6554c0]/20"
                  : "bg-black/5 dark:bg-white/5 text-[#4b5563] dark:text-[#c4cbde] hover:bg-black/10 dark:hover:bg-white/10"
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Animated Assets Cards Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredAssets.map((asset) => (
              <motion.div
                key={asset.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="rounded-[10px] p-5 border transition-shadow flex flex-col justify-between shadow-sm hover:shadow-xl"
                style={{
                  backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.9)" : "rgba(18, 20, 36, 0.85)",
                  borderColor: theme === "light" ? "#dfe3f0" : "rgba(139, 92, 246, 0.22)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] font-bold uppercase px-2 py-0.5 rounded-[4px] bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8]">
                      {asset.os} · {asset.format}
                    </span>
                    <span className="font-mono text-xs text-[#6b7280] dark:text-[#9ea4b5]">
                      {asset.size}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-[#111827] dark:text-white flex items-center space-x-1.5">
                    <span>{asset.label}</span>
                    {asset.recommended && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                        {lang === "en" ? "Recommended" : "Disarankan"}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-[#6b7280] dark:text-[#9ea4b5]">
                    <span className="font-mono text-[11px] bg-black/5 dark:bg-white/5 px-2 py-1 rounded block truncate">
                      {asset.instructions[lang]}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: theme === "light" ? "#f1f5f9" : "rgba(139, 92, 246, 0.12)" }}
                >
                  <motion.a
                    href={asset.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#6554c0] hover:bg-[#5443af] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Download" : "Unduh"}</span>
                  </motion.a>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Source Code & Verification Footer */}
        <div className="mt-10 p-4 rounded-[8px] border text-center text-xs text-[#4b5563] dark:text-[#9ea4b5] flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{
            backgroundColor: theme === "light" ? "#ffffff" : "rgba(18, 20, 36, 0.5)",
            borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.18)",
          }}
        >
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[#6554c0] dark:text-[#a79be8]" />
            <span>
              {lang === "en"
                ? "Prefer building from source? Clone the GitHub repository and run scripts/install-dev.sh"
                : "Ingin build sendiri dari source? Clone repositori GitHub lalu jalankan scripts/install-dev.sh"}
            </span>
          </div>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 font-semibold text-[#6554c0] dark:text-[#a79be8] hover:underline cursor-pointer"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </section>
  );
}
