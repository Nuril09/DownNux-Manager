import React, { useState, useEffect } from "react";
import { Moon, Sun, Globe, Download, Menu, X, ArrowUpRight } from "lucide-react";
import { GITHUB_REPO_URL, CURRENT_VERSION } from "../data/releasesData";

interface NavbarProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  lang: "en" | "id";
  onToggleLang: () => void;
}

export function Navbar({ theme, onToggleTheme, lang, onToggleLang }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { id: "architecture", href: "#architecture", label: lang === "en" ? "Architecture" : "Arsitektur" },
    { id: "downloads", href: "#downloads", label: lang === "en" ? "Downloads" : "Unduhan" },
    { id: "features", href: "#features", label: lang === "en" ? "Features" : "Fitur" },
    { id: "changelog", href: "#changelog", label: lang === "en" ? "What's New" : "Pembaruan", isNew: true },
    { id: "install", href: "#install", label: lang === "en" ? "Install" : "Cara Pasang" },
    { id: "docs", href: "#docs", label: lang === "en" ? "Docs & FAQ" : "Dokumentasi" },
  ];

  // Track scroll position for subtle header elevation and active section spy
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);

      const sectionIds = ["architecture", "downloads", "features", "changelog", "install", "docs", "faq"];
      const scrollPos = window.scrollY + 140;

      if (window.scrollY < 260) {
        setActiveSection("");
        return;
      }

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          const matched = sectionIds[i] === "faq" ? "docs" : sectionIds[i];
          setActiveSection(matched);
          break;
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on Escape key (R-32)
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 backdrop-blur-md border-b ${
        scrolled ? "shadow-sm" : ""
      }`}
      style={{
        backgroundColor:
          theme === "light"
            ? scrolled
              ? "rgba(255, 255, 255, 0.94)"
              : "rgba(255, 255, 255, 0.86)"
            : scrolled
              ? "rgba(11, 9, 23, 0.92)"
              : "rgba(11, 9, 23, 0.82)",
        borderColor: theme === "light" ? "#e4e8f2" : "rgba(139, 92, 246, 0.16)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">
        {/* 1. Left: Compact Stacked Brand Lockup */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <a
            href="#"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] rounded-[8px]"
            aria-label="DownNux Manager Home"
          >
            <img
              src="./icon.png"
              alt="DownNux Manager App Icon"
              width={36}
              height={36}
              className="w-9 h-9 rounded-[9px] object-contain shadow-sm group-hover:scale-105 transition-transform"
            />
          </a>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 leading-none">
              <a
                href="#"
                className="font-extrabold text-[15.5px] tracking-tight text-[#111827] dark:text-white hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] rounded-[4px]"
              >
                DownNux
              </a>
              <a
                href="#changelog"
                className="text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded-[5px] bg-[#6554c0]/15 text-[#5846b8] dark:text-[#bcb0f5] border border-[#6554c0]/25 hover:bg-[#6554c0]/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]"
                title={lang === "en" ? `View v${CURRENT_VERSION} release notes` : `Lihat catatan rilis v${CURRENT_VERSION}`}
              >
                v{CURRENT_VERSION}
              </a>
            </div>

            <div className="mt-1 flex items-center gap-1 text-[11px] leading-none text-[#6b7280] dark:text-[#9ea4b5]">
              <span>by</span>
              <a
                href="https://hoodtech.my.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#5846b8] dark:text-[#a79be8] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] rounded-[3px]"
                title="Visit HoodTech official website"
              >
                HoodTech
              </a>
            </div>
          </div>
        </div>

        {/* 2. Center: Recessed Segmented Navigation Dock */}
        <nav
          className="hidden lg:flex items-center p-1 rounded-[10px] border transition-colors"
          aria-label="Main Navigation"
          style={{
            backgroundColor: theme === "light" ? "rgba(241, 244, 251, 0.85)" : "rgba(19, 21, 38, 0.85)",
            borderColor: theme === "light" ? "#e2e6f2" : "rgba(255, 255, 255, 0.08)",
          }}
        >
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "location" : undefined}
                className={`relative px-3 py-1.5 rounded-[7px] text-[12.5px] font-semibold transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] ${
                  isActive
                    ? "bg-white dark:bg-[#252842] text-[#111827] dark:text-white shadow-sm"
                    : "text-[#4b5563] dark:text-[#b4bcd4] hover:text-[#111827] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                }`}
              >
                <span>{link.label}</span>
                {link.isNew && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#10b981]"
                    title={lang === "en" ? `New in v${CURRENT_VERSION}` : `Baru di v${CURRENT_VERSION}`}
                    aria-hidden="true"
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* 3. Right: Unified Utility Controls + Primary CTA */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Grouped Utility Bar (Lang + Theme + GitHub) */}
          <div
            className="flex items-center h-9 p-0.5 rounded-[8px] border transition-colors"
            style={{
              backgroundColor: theme === "light" ? "rgba(241, 244, 251, 0.75)" : "rgba(19, 21, 38, 0.75)",
              borderColor: theme === "light" ? "#dde2f0" : "rgba(255, 255, 255, 0.09)",
            }}
          >
            {/* Language Switcher */}
            <button
              type="button"
              onClick={onToggleLang}
              className="h-8 px-2.5 rounded-[6px] flex items-center gap-1.5 text-xs font-semibold text-[#374151] dark:text-[#c4cbde] hover:text-[#111827] dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]"
              aria-label={`Switch language to ${lang === "en" ? "Indonesian" : "English"}`}
              title={lang === "en" ? "Ganti ke Bahasa Indonesia" : "Switch to English"}
            >
              <Globe className="w-3.5 h-3.5 text-[#6554c0] dark:text-[#a79be8]" aria-hidden="true" />
              <span className="uppercase tracking-wide text-[11px]">{lang}</span>
            </button>

            <span className="w-px h-4 bg-black/10 dark:bg-white/10" aria-hidden="true" />

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#374151] dark:text-[#c4cbde] hover:text-[#111827] dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]"
              aria-label={`Toggle ${theme === "dark" ? "Light" : "Dark"} Mode`}
              title={`Toggle ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#6554c0]" aria-hidden="true" />
              )}
            </button>

            <span className="hidden sm:block w-px h-4 bg-black/10 dark:bg-white/10" aria-hidden="true" />

            {/* GitHub Repository Link */}
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 h-8 px-2.5 rounded-[6px] text-xs font-semibold text-[#374151] dark:text-[#c4cbde] hover:text-[#111827] dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]"
              title="Open GitHub Repository"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3 h-3 text-[#6b7280] dark:text-[#9ea4b5]" aria-hidden="true" />
            </a>
          </div>

          {/* Primary Download CTA */}
          <a
            href="#downloads"
            className="h-9 px-3.5 rounded-[8px] bg-[#6554c0] hover:bg-[#5443af] active:translate-y-[0.5px] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] focus-visible:ring-offset-2"
          >
            <Download className="w-3.5 h-3.5 text-white flex-shrink-0" aria-hidden="true" />
            <span>Get</span>
          </a>

          {/* Mobile Menu Button (44px tap target via w-10 h-10 on mobile) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-10 h-10 rounded-[8px] border border-[#d1d5db] dark:border-[#2d324d] flex items-center justify-center text-[#374151] dark:text-[#c4cbde] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" aria-hidden="true" /> : <Menu className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t px-4 pt-3 pb-4 space-y-1 bg-white/98 dark:bg-[#0e101f]/98"
          style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.18)" }}
        >
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-[7px] text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#6554c0]/15 text-[#6554c0] dark:text-[#b4a8f0] font-semibold"
                    : "text-[#374151] dark:text-[#d1d5db] hover:bg-[#6554c0]/10 hover:text-[#6554c0]"
                }`}
              >
                <span>{link.label}</span>
                {link.isNew && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-[#10b981]/15 text-[#059669] dark:text-[#34d399]">
                    v{CURRENT_VERSION}
                  </span>
                )}
              </a>
            );
          })}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 rounded-[7px] text-sm font-medium text-[#374151] dark:text-[#d1d5db] hover:bg-[#6554c0]/10 hover:text-[#6554c0]"
          >
            <span>GitHub Repository</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#9ca3af]" aria-hidden="true" />
          </a>
        </div>
      )}
    </header>
  );
}
