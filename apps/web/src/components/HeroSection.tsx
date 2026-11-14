import React, { useState, useEffect } from "react";
import { Download, Terminal, ShieldCheck, Cpu, HardDrive } from "lucide-react";
import { RELEASE_ASSETS, ReleaseAsset, CURRENT_VERSION } from "../data/releasesData";

interface HeroSectionProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function HeroSection({ theme, lang }: HeroSectionProps) {
  const [detectedOs, setDetectedOs] = useState<"linux" | "windows" | "macos">("linux");
  const [selectedAsset, setSelectedAsset] = useState<ReleaseAsset | null>(null);

  // Client-side smart OS detection
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) {
      setDetectedOs("windows");
    } else if (userAgent.includes("mac")) {
      setDetectedOs("macos");
    } else {
      setDetectedOs("linux");
    }
  }, []);

  // Update recommended asset based on detected OS
  useEffect(() => {
    const recommended =
      RELEASE_ASSETS.find((a) => a.os === detectedOs && a.recommended) ||
      RELEASE_ASSETS.find((a) => a.os === detectedOs) ||
      RELEASE_ASSETS[0];
    setSelectedAsset(recommended);
  }, [detectedOs]);

  return (
    <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Value Proposition, and Smart CTAs */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Context Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[6px] text-xs font-semibold border bg-black/10 dark:bg-white/5"
              style={{
                borderColor: theme === "light" ? "#dcdfe9" : "rgba(139, 92, 246, 0.3)",
                color: theme === "light" ? "#4b5563" : "#d1d5db",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#2dd4bf]" />
              <span>
                {lang === "en"
                  ? `Release v${CURRENT_VERSION} · Powered by Hybrid aria2 + yt-dlp`
                  : `Rilis v${CURRENT_VERSION} · Didukung Hybrid aria2 + yt-dlp`}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#111827] dark:text-white leading-[1.15]">
              {lang === "en" ? (
                <>
                  High-speed, multi-channel download accelerator for{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] via-[#6554c0] to-[#2dd4bf]">
                    desktop power users
                  </span>
                  .
                </>
              ) : (
                <>
                  Akselerator unduhan multi-kanal berkecepatan tinggi untuk{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] via-[#6554c0] to-[#2dd4bf]">
                    pengguna desktop
                  </span>
                  .
                </>
              )}
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-[#4b5563] dark:text-[#a0a8c2] leading-relaxed max-w-xl">
              {lang === "en"
                ? "Split large files into up to 32 parallel HTTP Range connections. Active downloads persist in an independent system daemon and resume atomically through SQLite Write-Ahead Logging."
                : "Membagi file besar menjadi hingga 32 koneksi HTTP Range secara paralel. Unduhan tetap berjalan di background daemon mandiri dan pulih instan tanpa korupsi data berkat SQLite Write-Ahead Logging."}
            </p>

            {/* Primary Action Button tailored to detected OS */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {selectedAsset && (
                  <a
                    href={selectedAsset.downloadUrl}
                    className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-[8px] bg-[#6554c0] hover:bg-[#5443af] text-white font-bold text-sm shadow-lg shadow-[#6554c0]/30 transition-all hover:-translate-y-0.5"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>
                      {lang === "en"
                        ? `Download for ${detectedOs.toUpperCase()} (${selectedAsset.format.toUpperCase()}) · v${CURRENT_VERSION}`
                        : `Unduh untuk ${detectedOs.toUpperCase()} (${selectedAsset.format.toUpperCase()}) · v${CURRENT_VERSION}`}
                    </span>
                  </a>
                )}

                <a
                  href="#install"
                  className="inline-flex items-center justify-center space-x-2 px-5 py-3.5 rounded-[8px] border text-sm font-semibold transition-colors"
                  style={{
                    borderColor: theme === "light" ? "#d1d5db" : "rgba(139, 92, 246, 0.3)",
                    backgroundColor: theme === "light" ? "#ffffff" : "rgba(255, 255, 255, 0.04)",
                    color: theme === "light" ? "#1f2937" : "#e5e7eb",
                  }}
                >
                  <Terminal className="w-4 h-4 text-[#6554c0] dark:text-[#a79be8]" />
                  <span>{lang === "en" ? "Terminal Guide" : "Panduan Terminal"}</span>
                </a>
              </div>

              {/* OS Switcher Pills */}
              <div className="flex items-center space-x-2 text-xs text-[#6b7280] dark:text-[#8f9bb8]">
                <span>{lang === "en" ? "Switch platform:" : "Pilih OS lain:"}</span>
                {(["linux", "windows", "macos"] as const).map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setDetectedOs(platform)}
                    className={`px-2 py-0.5 rounded-[4px] font-semibold transition-colors uppercase ${
                      detectedOs === platform
                        ? "bg-[#6554c0]/20 text-[#6554c0] dark:text-[#a79be8] border border-[#6554c0]/40"
                        : "hover:text-[#111827] dark:hover:text-white"
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Feature Badges (Real Technical Attributes) */}
            <div className="pt-4 grid grid-cols-3 gap-3 border-t max-w-lg"
              style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.16)" }}
            >
              <div className="flex items-center space-x-2 text-xs text-[#4b5563] dark:text-[#c4cbde]">
                <Cpu className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" />
                <span className="font-medium">32 Channels</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-[#4b5563] dark:text-[#c4cbde]">
                <HardDrive className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                <span className="font-medium">SQLite WAL</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-[#4b5563] dark:text-[#c4cbde]">
                <ShieldCheck className="w-4 h-4 text-[#8b5cf6] flex-shrink-0" />
                <span className="font-medium">GPL-3.0 Free</span>
              </div>
            </div>

          </div>

          {/* Right Column: High-Fidelity Desktop Showcase */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[12px] p-2 border shadow-2xl transition-all"
              style={{
                backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.85)" : "rgba(18, 20, 36, 0.8)",
                borderColor: theme === "light" ? "#dfe3f0" : "rgba(139, 92, 246, 0.28)",
              }}
            >
              <img
                src="./assets/downnux-hero.png"
                alt="DownNux Manager desktop interface showcase on Ubuntu Linux"
                width={920}
                height={590}
                fetchPriority="high"
                className="w-full h-auto rounded-[8px] object-cover shadow-inner"
              />

              {/* Floating Highlight Annotation */}
              <div className="absolute -bottom-4 -left-4 hidden sm:flex items-center space-x-2 px-3.5 py-2 rounded-[8px] border shadow-lg text-xs font-mono font-medium"
                style={{
                  backgroundColor: theme === "light" ? "#ffffff" : "#121424",
                  borderColor: theme === "light" ? "#e2e8f0" : "#2a304e",
                  color: theme === "light" ? "#0f172a" : "#f1f5f9",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>daemon: active (systemd --user)</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

