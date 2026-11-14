import React, { useState } from "react";
import { Layers, Eye, Sliders, CheckCircle2 } from "lucide-react";

interface FeatureGalleryProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function FeatureGallery({ theme, lang }: FeatureGalleryProps) {
  const [activeFeature, setActiveFeature] = useState<"inspector" | "modal" | "dashboard">("inspector");

  const features = [
    {
      id: "inspector" as const,
      title: {
        en: "Standalone Floating Inspector",
        id: "Jendela Melayang Pemantau Progres",
      },
      tagline: {
        en: "Dedicated 32-segment real-time chunk allocation map and active thread telemetry.",
        id: "Peta alokasi 32-segmen real-time dan telemetri koneksi aktif mandiri.",
      },
      image: "./assets/feature-inspector.png",
      bullets: {
        en: [
          "Detached compact window inspired by IDM workflow",
          "Visualizes active connection threads and dynamic chunk allocations",
          "Real-time transfer speed sparkline and estimated completion time",
          "Single-instance deduplication: clicking inspect brings the window forward without duplicates",
        ],
        id: [
          "Jendela melayang terpisah terinspirasi dari kemudahan IDM",
          "Visualisasi thread koneksi aktif dan alokasi chunk dinamis",
          "Grafik kecepatan transfer real-time dan perkiraan waktu tersisa",
          "Deduplikasi jendela: klik tombol inspeksi membawa jendela ke depan tanpa membuat pop-up ganda",
        ],
      },
    },
    {
      id: "modal" as const,
      title: {
        en: "Smart Pre-Download Link Inspector",
        id: "Inspeksi Link & Pilihan Format Cerdas",
      },
      tagline: {
        en: "Analyzes headers, HTTP Range resume capability, and provides video resolution presets.",
        id: "Menganalisis header, kapabilitas Range resume, dan pilihan resolusi video.",
      },
      image: "./assets/feature-add-modal.png",
      bullets: {
        en: [
          "Auto-detects online video links from YouTube, Shorts, TikTok, Vimeo, and X",
          "Video Resolution Selector: Best (Auto), 1080p FHD, 720p HD, and 480p SD",
          "Audio Bitrate Presets: 320 kbps Studio, 192 kbps HQ, and 128 kbps Fast CBR",
          "Universal compatibility: forces H.264 + AAC + faststart so videos play on WhatsApp and Gmail without corruption",
        ],
        id: [
          "Otomatis mendeteksi link video dari YouTube, Shorts, TikTok, Vimeo, dan X",
          "Pilihan resolusi video: Terbaik (Otomatis), 1080p FHD, 720p HD, dan 480p SD",
          "Pilihan kualitas audio: 320 kbps Studio, 192 kbps HQ, dan 128 kbps Cepat",
          "Kompatibilitas universal: format H.264 + AAC + faststart agar video 100% aman diputar di WhatsApp dan Gmail",
        ],
      },
    },
    {
      id: "dashboard" as const,
      title: {
        en: "Centralized Library & Paused Management",
        id: "Pustaka Terpadu & Manajemen File Jeda",
      },
      tagline: {
        en: "Organize downloads by category, search instantly, and resume paused files in batch.",
        id: "Kelola file berdasarkan kategori, cari instan, dan lanjutkan unduhan tertunda.",
      },
      image: "./assets/feature-dashboard.png",
      bullets: {
        en: [
          "Dedicated Paused filter in sidebar and Active subtab for quick access",
          "Batch operations: Pause All, Resume All, and multi-selection deletion",
          "Integrated BitTorrent engine with .torrent file drag-and-drop and Magnet link parsing",
          "Background service integration: status pill confirms daemon active and ready to capture",
        ],
        id: [
          "Tab filter Paused khusus di sidebar dan sub-tab Active untuk akses cepat",
          "Operasi massal: Jeda Semua, Lanjutkan Semua, dan hapus banyak file sekaligus",
          "Mendukung file .torrent dan Magnet link dengan drag-and-drop langsung",
          "Indikator status layanan sistem: memastikan daemon selalu aktif menangkap unduhan",
        ],
      },
    },
  ];

  const current = features.find((f) => f.id === activeFeature) || features[0];

  return (
    <section id="features" className="py-20 border-t transition-colors"
      style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.16)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Product Highlights</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-4xl">
            {lang === "en" ? "Engineered for Daily Download Workflows" : "Didesain untuk Kebutuhan Unduhan Harian"}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#4b5563] dark:text-[#a0a8c2]">
            {lang === "en"
              ? "Every screen is designed for speed and clarity. No fake mockups: explore real application views below."
              : "Setiap tampilan dirancang untuk kecepatan dan kepraktisan. Bukan sekadar mockup: jelajahi tampilan asli aplikasi di bawah ini."}
          </p>
        </div>

        {/* Feature Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {features.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFeature(f.id)}
              className={`px-4 py-2.5 rounded-[8px] text-xs font-bold transition-all flex items-center space-x-2 ${
                activeFeature === f.id
                  ? "bg-[#6554c0] text-white shadow-md shadow-[#6554c0]/25"
                  : "bg-black/5 dark:bg-white/5 text-[#4b5563] dark:text-[#c4cbde] hover:bg-black/10 dark:hover:bg-white/10"
              }`}
            >
              <span>{f.title[lang]}</span>
            </button>
          ))}
        </div>

        {/* Feature Display Card (Split Screen + Details) */}
        <div className="rounded-[12px] p-6 lg:p-8 border shadow-xl transition-all"
          style={{
            backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(18, 20, 36, 0.88)",
            borderColor: theme === "light" ? "#dfe3f0" : "rgba(139, 92, 246, 0.25)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Feature Image */}
            <div className="lg:col-span-7">
              <div className="rounded-[8px] overflow-hidden border p-1.5 bg-black/10 dark:bg-black/50"
                style={{ borderColor: theme === "light" ? "#e2e8f0" : "#2a2f4d" }}
              >
                <img
                  src={current.image}
                  alt={current.title[lang]}
                  width={800}
                  height={500}
                  loading="lazy"
                  className="w-full h-auto rounded-[6px] object-cover shadow-md"
                />
              </div>
            </div>

            {/* Feature Description & Bullet List */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-mono font-bold text-[#6554c0] dark:text-[#a79be8] uppercase tracking-wider">
                Feature Focus
              </span>
              <h3 className="text-2xl font-bold text-[#111827] dark:text-white">
                {current.title[lang]}
              </h3>
              <p className="text-sm text-[#4b5563] dark:text-[#a0a8c2] leading-relaxed">
                {current.tagline[lang]}
              </p>

              <div className="pt-2 space-y-2.5">
                {current.bullets[lang].map((bullet, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 text-xs text-[#374151] dark:text-[#d1d5db]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

