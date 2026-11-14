import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { AnatomyRig } from "./components/AnatomyRig";
import { DownloadSection } from "./components/DownloadSection";
import { FeatureGallery } from "./components/FeatureGallery";
import { InstallGuide } from "./components/InstallGuide";
import { DocumentationSection } from "./components/DocumentationSection";
import { Footer } from "./components/Footer";
import { Cpu, RefreshCw, Layers } from "lucide-react";
import { motion } from "framer-motion";

export function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("downnux-theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  });

  const [lang, setLang] = useState<"en" | "id">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("downnux-lang");
      if (saved === "id" || saved === "en") return saved;
      return navigator.language.startsWith("id") ? "id" : "en";
    }
    return "en";
  });

  // Sync theme to <html> tag
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("downnux-theme", theme);
  }, [theme]);

  // Persist language
  useEffect(() => {
    localStorage.setItem("downnux-lang", lang);
  }, [lang]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const toggleLang = () => setLang((prev) => (prev === "en" ? "id" : "en"));

  return (
    <div className={`min-h-screen relative font-sans ${theme === "dark" ? "dark bg-[#0b0917] text-[#f4f6fb]" : "bg-[#f6f7fc] text-[#141726]"}`}>
      
      {/* 1. Fixed Background Canvas Artwork Layer (Dynamically switches between dark and light artwork) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-300"
        style={{
          backgroundImage: theme === "dark" ? "url('./assets/downnux-bg.jpg')" : "url('./assets/downnux-bg-light.jpg')",
          opacity: theme === "dark" ? 0.45 : 0.88,
        }}
        aria-hidden="true"
      />

      {/* 2. Directional Adaptive Scrim Overlay (Ensures WCAG AA/AAA text contrast at all times) */}
      <div
        className={`fixed inset-0 pointer-events-none z-0 transition-colors duration-300 ${
          theme === "dark" ? "bg-canvas-scrim-dark" : "bg-canvas-scrim-light"
        }`}
        aria-hidden="true"
      />

      {/* 3. Main Application Content (Floats comfortably above the scrim) */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar
          theme={theme}
          onToggleTheme={toggleTheme}
          lang={lang}
          onToggleLang={toggleLang}
        />

        <main className="flex-grow">
          {/* Hero Section */}
          <HeroSection theme={theme} lang={lang} />

          {/* Section 2: Architecture & Interactive Anatomy Rig */}
          <section id="architecture" className="py-20 border-t transition-colors"
            style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.16)" }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              <motion.div
                className="text-center max-w-2xl mx-auto mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] mb-3">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Anatomy Technical Rig</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-4xl">
                  {lang === "en" ? "How Acceleration & Crash Recovery Work" : "Bagaimana Akselerasi & Pemulihan Crash Bekerja"}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-[#4b5563] dark:text-[#a0a8c2]">
                  {lang === "en"
                    ? "Interactive isometric rig illustrating the 32-channel Range Distributor and atomic SQLite Write-Ahead Logging vault."
                    : "Simulasi mesin isometrik interaktif yang menjelaskan pembagian 32 jalur Range dan penyimpanan aman SQLite Write-Ahead Logging."}
                </p>
              </motion.div>

              {/* Anatomy Rig Card Component */}
              <motion.div
                className="max-w-4xl mx-auto"
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <AnatomyRig theme={theme} lang={lang} />
              </motion.div>

              {/* Explanatory Technical Notes */}
              <div className="mt-8 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <motion.div
                  className="p-4 rounded-[8px] border shadow-sm hover:shadow-md transition-shadow"
                  whileHover={{ y: -2 }}
                  style={{
                    backgroundColor: theme === "light" ? "#ffffff" : "rgba(18, 20, 36, 0.8)",
                    borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.2)",
                  }}
                >
                  <div className="font-bold text-[#111827] dark:text-white flex items-center space-x-1.5 mb-1">
                    <Layers className="w-4 h-4 text-[#2dd4bf]" />
                    <span>{lang === "en" ? "Dynamic Multi-Channel Splitting" : "Pemisahan Multi-Kanal Dinamis"}</span>
                  </div>
                  <p className="text-[#4b5563] dark:text-[#a0a8c2] leading-relaxed">
                    {lang === "en"
                      ? "Unlike standard browser downloads that pull a single stream, DownNux issues HTTP Range headers to split files into up to 32 concurrent slices, saturating available bandwidth."
                      : "Berbeda dengan download biasa yang hanya mengandalkan 1 jalur, DownNux mengirim header HTTP Range untuk memecah file menjadi hingga 32 irisan paralel dan memaksimalkan kuota bandwidth."}
                  </p>
                </motion.div>

                <motion.div
                  className="p-4 rounded-[8px] border shadow-sm hover:shadow-md transition-shadow"
                  whileHover={{ y: -2 }}
                  style={{
                    backgroundColor: theme === "light" ? "#ffffff" : "rgba(18, 20, 36, 0.8)",
                    borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.2)",
                  }}
                >
                  <div className="font-bold text-[#111827] dark:text-white flex items-center space-x-1.5 mb-1">
                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                    <span>{lang === "en" ? "Atomic SQLite WAL Persistence" : "Ketahanan Atomik SQLite WAL"}</span>
                  </div>
                  <p className="text-[#4b5563] dark:text-[#a0a8c2] leading-relaxed">
                    {lang === "en"
                      ? "Every downloaded byte chunk is recorded in SQLite Write-Ahead Logging storage. If your system crashes or power is lost, DownNux resumes from the exact recorded offset without re-downloading."
                      : "Setiap pecahan byte dicatat ke database SQLite Write-Ahead Logging. Jika komputer mendadak mati atau koneksi putus, unduhan dilanjutkan persis dari offset terakhir tanpa perlu mengulang dari 0%."}
                  </p>
                </motion.div>
              </div>

            </div>
          </section>

          {/* Section 3: Downloads Matrix */}
          <DownloadSection theme={theme} lang={lang} />

          {/* Section 4: Feature Gallery with Real Screenshots */}
          <FeatureGallery theme={theme} lang={lang} />

          {/* Section 5: Install & Extension Setup Guide */}
          <InstallGuide theme={theme} lang={lang} />

          {/* Section 6: Searchable Documentation, CLI & FAQ */}
          <DocumentationSection theme={theme} lang={lang} />
        </main>

        <Footer theme={theme} lang={lang} />
      </div>

    </div>
  );
}

