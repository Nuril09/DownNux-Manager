import React, { useState } from "react";
import { Download, Check, Copy, ExternalLink, ShieldCheck, Terminal } from "lucide-react";
import { RELEASE_ASSETS, GITHUB_REPO_URL, CURRENT_VERSION } from "../data/releasesData";

interface DownloadSectionProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function DownloadSection({ theme, lang }: DownloadSectionProps) {
  const [activeTab, setActiveTab] = useState<"all" | "linux" | "windows" | "macos" | "extension">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredAssets =
    activeTab === "all"
      ? RELEASE_ASSETS
      : RELEASE_ASSETS.filter((a) => a.os === activeTab);

  const handleCopyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="downloads" className="py-20 border-t transition-colors"
      style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.16)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
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
        </div>

        {/* Platform Selector Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: "all", label: lang === "en" ? "All Packages" : "Semua Paket" },
            { id: "linux", label: "Linux (.deb / AppImage)" },
            { id: "windows", label: "Windows (.exe / .zip)" },
            { id: "macos", label: "macOS (.dmg / .zip)" },
            { id: "extension", label: "Browser Extension" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-[8px] text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#6554c0] text-white shadow-md shadow-[#6554c0]/20"
                  : "bg-black/5 dark:bg-white/5 text-[#4b5563] dark:text-[#c4cbde] hover:bg-black/10 dark:hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assets Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-[10px] p-5 border transition-all flex flex-col justify-between"
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

                <h3 className="font-bold text-base text-[#111827] dark:text-white leading-snug">
                  {asset.label}
                </h3>
                <p className="font-mono text-[11px] text-[#6b7280] dark:text-[#94a0bd] mt-1 break-all">
                  {asset.name}
                </p>

                {/* Quick install command */}
                <div className="mt-4 p-2.5 rounded-[6px] bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/5 text-[11px] font-mono text-[#4b5563] dark:text-[#cbd5e1] flex items-center justify-between">
                  <span className="truncate pr-2">{asset.instructions[lang]}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCommand(asset.id, asset.instructions[lang])}
                    className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[#6554c0] dark:text-[#a79be8]"
                    title="Copy command"
                    aria-label="Copy command"
                  >
                    {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action Download Button */}
              <div className="mt-5 pt-4 border-t flex items-center justify-between"
                style={{ borderColor: theme === "light" ? "#eaedf5" : "rgba(139, 92, 246, 0.14)" }}
              >
                <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SHA256 Signed</span>
                </div>

                <a
                  href={asset.downloadUrl}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#6554c0] hover:bg-[#5443af] text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Download" : "Unduh"}</span>
                </a>
              </div>
            </div>
          ))}
        </div>

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
            className="inline-flex items-center space-x-1 font-semibold text-[#6554c0] dark:text-[#a79be8] hover:underline"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </section>
  );
}
