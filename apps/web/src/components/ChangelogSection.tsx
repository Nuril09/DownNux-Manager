import React from "react";
import { History, CheckCircle2, ExternalLink, Calendar, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { CHANGELOG_DATA, GITHUB_REPO_URL } from "../data/releasesData";

interface ChangelogSectionProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function ChangelogSection({ theme, lang }: ChangelogSectionProps) {
  return (
    <section
      id="changelog"
      className="py-20 border-t transition-colors scroll-mt-16"
      style={{
        borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.16)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] mb-3">
            <History className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{lang === "en" ? "Release Notes & History" : "Catatan Rilis & Riwayat Pembaruan"}</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-4xl">
            {lang === "en" ? "What's New in DownNux" : "Apa yang Baru di DownNux"}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#4b5563] dark:text-[#a0a8c2]">
            {lang === "en"
              ? "Follow our latest milestones, performance upgrades, and architectural enhancements across every release."
              : "Ikuti perkembangan fitur terbaru, peningkatan performa, dan optimasi arsitektur di setiap rilis resmi."}
          </p>
        </motion.div>

        {/* Changelog Timeline / Grid */}
        <div className="max-w-4xl mx-auto space-y-6">
          {CHANGELOG_DATA.map((entry, index) => {
            const isLatest = index === 0;
            return (
              <motion.article
                key={entry.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className={`relative rounded-[10px] p-6 sm:p-8 border transition-all ${
                  isLatest
                    ? "shadow-lg border-[#8b5cf6]/40 dark:border-[#8b5cf6]/35"
                    : "border-black/10 dark:border-white/10"
                }`}
                style={{
                  backgroundColor:
                    theme === "light"
                      ? isLatest
                        ? "#ffffff"
                        : "rgba(255, 255, 255, 0.92)"
                      : isLatest
                        ? "rgba(20, 22, 38, 0.95)"
                        : "rgba(18, 20, 34, 0.85)",
                }}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-white/10">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center font-mono text-sm font-bold text-[#6554c0] dark:text-[#b4a8f0] px-2.5 py-1 rounded-[6px] bg-[#6554c0]/15">
                      <Tag className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      v{entry.version}
                    </span>
                    {entry.badge && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] bg-[#10b981]/15 text-[#059669] dark:text-[#34d399] border border-[#10b981]/30">
                        {entry.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-[#6b7280] dark:text-[#9ea4b5]">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      {entry.date}
                    </span>
                    <a
                      href={entry.tagUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-[#6554c0] dark:text-[#a79be8] hover:underline font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] rounded-[4px]"
                    >
                      <span>GitHub Tag</span>
                      <ExternalLink className="w-3 h-3 ml-1" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                {/* Body */}
                <div className="pt-4 space-y-3">
                  <h3 className="text-lg sm:text-xl font-bold text-[#111827] dark:text-white">
                    {entry.title[lang]}
                  </h3>

                  <ul className="space-y-2.5 pt-1">
                    {entry.highlights[lang].map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        className="flex items-start space-x-3 text-sm text-[#374151] dark:text-[#d1d5db] leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 mt-1 text-[#10b981] flex-shrink-0" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* View full releases link */}
        <div className="mt-10 text-center">
          <a
            href={`${GITHUB_REPO_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-sm font-semibold text-[#6554c0] dark:text-[#a79be8] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] rounded-[4px]"
          >
            <span>{lang === "en" ? "Browse all historical releases on GitHub" : "Lihat seluruh arsip rilis di GitHub"}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
