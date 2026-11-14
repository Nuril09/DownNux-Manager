import React, { useState } from "react";
import { Moon, Sun, Globe, Download, Menu, X, ArrowUpRight } from "lucide-react";
import { GITHUB_REPO_URL } from "../data/releasesData";

interface NavbarProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  lang: "en" | "id";
  onToggleLang: () => void;
}

export function Navbar({ theme, onToggleTheme, lang, onToggleLang }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#downloads", label: lang === "en" ? "Downloads" : "Unduh" },
    { href: "#architecture", label: lang === "en" ? "Architecture" : "Arsitektur" },
    { href: "#features", label: lang === "en" ? "Features" : "Fitur" },
    { href: "#install", label: lang === "en" ? "Install Guide" : "Cara Pasang" },
    { href: "#docs", label: lang === "en" ? "Documentation" : "Dokumentasi" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full transition-colors duration-200 backdrop-blur-md border-b"
      style={{
        backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.88)" : "rgba(11, 9, 23, 0.85)",
        borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.18)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <a href="#" className="flex items-center space-x-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] rounded-[6px]">
          <div className="w-9 h-9 rounded-[8px] bg-gradient-to-br from-[#6554c0] to-[#493b96] flex items-center justify-center shadow-md shadow-[#6554c0]/25 group-hover:scale-105 transition-transform">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-[16px] tracking-tight text-[#111827] dark:text-white flex items-center space-x-1.5">
              <span>DownNux</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] font-bold">
                v0.0.5
              </span>
            </div>
            <div className="text-[10px] text-[#6b7280] dark:text-[#9ea4b5] leading-none">
              by HoodTech
            </div>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-[6px] text-[13px] font-medium text-[#4b5563] dark:text-[#c4cbde] hover:text-[#111827] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Controls & Utilities */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLang}
            className="h-9 px-2.5 rounded-[6px] border border-[#d1d5db] dark:border-[#2d324d] flex items-center space-x-1 text-xs font-semibold text-[#4b5563] dark:text-[#c4cbde] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label={`Switch language to ${lang === "en" ? "Indonesian" : "English"}`}
            title={lang === "en" ? "Ganti ke Bahasa Indonesia" : "Switch to English"}
          >
            <Globe className="w-3.5 h-3.5 text-[#6554c0] dark:text-[#a79be8]" />
            <span className="uppercase">{lang}</span>
          </button>

          {/* Theme Toggle (Dark / Light) */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-[6px] border border-[#d1d5db] dark:border-[#2d324d] flex items-center justify-center text-[#4b5563] dark:text-[#c4cbde] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label={`Toggle ${theme === "dark" ? "Light" : "Dark"} Mode`}
            title={`Toggle ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#6554c0]" />
            )}
          </button>

          {/* Direct GitHub Link */}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center space-x-1 h-9 px-3 rounded-[6px] text-xs font-medium border border-[#d1d5db] dark:border-[#2d324d] text-[#4b5563] dark:text-[#c4cbde] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <span>GitHub</span>
            <ArrowUpRight className="w-3 h-3 text-[#9ca3af]" />
          </a>

          {/* Jump to Download CTA */}
          <a
            href="#downloads"
            className="h-9 px-3.5 rounded-[6px] bg-[#6554c0] hover:bg-[#5443af] text-white text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span className="hidden xs:inline">{lang === "en" ? "Get DownNux" : "Unduh Sekarang"}</span>
            <span className="xs:hidden">{lang === "en" ? "Get" : "Unduh"}</span>
          </a>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-[6px] border border-[#d1d5db] dark:border-[#2d324d] flex items-center justify-center text-[#4b5563] dark:text-[#c4cbde]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t px-4 pt-3 pb-4 space-y-1 bg-white/95 dark:bg-[#0e101f]/95 backdrop-blur-lg"
          style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.18)" }}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-[6px] text-sm font-medium text-[#374151] dark:text-[#d1d5db] hover:bg-[#6554c0]/10 hover:text-[#6554c0]"
            >
              {link.label}
            </a>
          ))}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-[6px] text-sm font-medium text-[#374151] dark:text-[#d1d5db] hover:bg-[#6554c0]/10 hover:text-[#6554c0]"
          >
            <span>GitHub Repository</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#9ca3af]" />
          </a>
        </div>
      )}
    </header>
  );
}
