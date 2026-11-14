import React from "react";
import { Download, ExternalLink, Heart } from "lucide-react";
import { GITHUB_REPO_URL, RELEASES_PAGE_URL, CURRENT_VERSION } from "../data/releasesData";

interface FooterProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function Footer({ theme, lang }: FooterProps) {
  return (
    <footer className="border-t py-12 transition-colors relative z-10"
      style={{
        backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.95)" : "rgba(11, 9, 23, 0.92)",
        borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.2)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Brand Info */}
          <div className="flex items-center space-x-3 text-center md:text-left">
            <div className="w-8 h-8 rounded-[6px] bg-[#6554c0] flex items-center justify-center text-white shadow-sm">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-[#111827] dark:text-white">
                DownNux Manager <span className="font-mono text-xs font-normal text-[#6554c0] dark:text-[#a79be8]">v{CURRENT_VERSION}</span>
              </div>
              <div className="text-xs text-[#6b7280] dark:text-[#9ea4b5]">
                {lang === "en" ? "Engineered and maintained by " : "Dikembangkan dan dikelola oleh "}
                <a
                  href="https://hoodtech.my.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#6554c0] dark:text-[#a79be8] hover:underline"
                >
                  HoodTech
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Links (Real destinations only - Rule R-24) */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-[#4b5563] dark:text-[#c4cbde]">
            <a href="#downloads" className="hover:text-[#6554c0] dark:hover:text-white transition-colors">
              {lang === "en" ? "Downloads" : "Unduhan"}
            </a>
            <a href="#architecture" className="hover:text-[#6554c0] dark:hover:text-white transition-colors">
              {lang === "en" ? "Architecture" : "Arsitektur"}
            </a>
            <a href="#install" className="hover:text-[#6554c0] dark:hover:text-white transition-colors">
              {lang === "en" ? "Installation" : "Instalasi"}
            </a>
            <a href={RELEASES_PAGE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 hover:text-[#6554c0] dark:hover:text-white transition-colors">
              <span>Releases</span>
              <ExternalLink className="w-3 h-3 text-[#9ca3af]" />
            </a>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 hover:text-[#6554c0] dark:hover:text-white transition-colors">
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-[#9ca3af]" />
            </a>
          </div>

          {/* License & Copyright */}
          <div className="text-xs text-[#6b7280] dark:text-[#9ea4b5] text-center md:text-right font-mono">
            <div>GNU General Public License v3.0</div>
            <div className="text-[11px] text-[#9ca3af] dark:text-[#6b7280] mt-0.5">
              © {new Date().getFullYear()} HoodTech. Free and Open Source.
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
