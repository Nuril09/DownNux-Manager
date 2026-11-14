import React, { useState } from "react";
import { BookOpen, Search, Terminal, HelpCircle, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { COMPARISON_DATA, CLI_COMMANDS, FAQ_LIST } from "../data/docsData";

interface DocumentationSectionProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function DocumentationSection({ theme, lang }: DocumentationSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCliIndex, setSelectedCliIndex] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Filter FAQ items by search query
  const filteredFaqs = FAQ_LIST.filter(
    (item) =>
      item.q[lang].toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a[lang].toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="docs" className="py-20 border-t transition-colors"
      style={{ borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.16)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        
        {/* Section 1: Comparison Table */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Technical Benchmark</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-4xl">
              {lang === "en" ? "How DownNux Compares" : "Perbandingan Kemampuan Teknis"}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#4b5563] dark:text-[#a0a8c2]">
              {lang === "en"
                ? "Objective architectural comparison between browser downloaders, conventional tools, and DownNux."
                : "Perbandingan arsitektur nyata antara downloader browser bawaan, perkakas konvensional, dan DownNux."}
            </p>
          </div>

          <div className="rounded-[12px] border overflow-x-auto shadow-md"
            style={{
              backgroundColor: theme === "light" ? "#ffffff" : "rgba(18, 20, 36, 0.8)",
              borderColor: theme === "light" ? "#dfe3f0" : "rgba(139, 92, 246, 0.22)",
            }}
          >
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b"
                  style={{
                    backgroundColor: theme === "light" ? "#f8fafc" : "#131626",
                    borderColor: theme === "light" ? "#eaedf5" : "rgba(139, 92, 246, 0.18)",
                  }}
                >
                  <th className="py-3.5 px-4 font-bold text-[#111827] dark:text-white w-2/5">
                    {lang === "en" ? "Feature / Capability" : "Kemampuan Teknis"}
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-[#64748b] dark:text-[#94a3b8] w-1/5">
                    {lang === "en" ? "Browser Default" : "Browser Bawaan"}
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-[#64748b] dark:text-[#94a3b8] w-1/5">
                    {lang === "en" ? "Traditional Tools" : "Downloader Konvensional"}
                  </th>
                  <th className="py-3.5 px-4 font-bold text-[#6554c0] dark:text-[#a79be8] bg-[#6554c0]/5 w-1/5">
                    DownNux Manager
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y"
                style={{ borderColor: theme === "light" ? "#eaedf5" : "rgba(139, 92, 246, 0.1)" }}
              >
                {COMPARISON_DATA.map((row, idx) => (
                  <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#111827] dark:text-white">
                      {row.feature[lang]}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748b] dark:text-[#94a3b8]">
                      {row.browser[lang]}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748b] dark:text-[#94a3b8]">
                      {row.traditional[lang]}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#111827] dark:text-white bg-[#6554c0]/5">
                      {row.downnux[lang]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Headless CLI Reference */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] mb-3">
              <Terminal className="w-3.5 h-3.5" />
              <span>Headless Automation</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-4xl">
              {lang === "en" ? "Command Line Interface (CLI)" : "Antarmuka Baris Perintah (CLI)"}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#4b5563] dark:text-[#a0a8c2]">
              {lang === "en"
                ? "Every daemon operation can be scripted headlessly using the included downnux binary."
                : "Semua operasi daemon dapat dijalankan tanpa GUI melalui perintah CLI bawaan downnux."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Commands List Buttons */}
            <div className="lg:col-span-5 space-y-2">
              {CLI_COMMANDS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedCliIndex(idx)}
                  className={`w-full text-left p-3.5 rounded-[8px] border transition-all ${
                    selectedCliIndex === idx
                      ? "bg-[#6554c0] text-white border-[#5343af] shadow-md"
                      : "bg-white dark:bg-[#121424] text-[#374151] dark:text-[#cbd5e1] border-[#e2e8f0] dark:border-[#282d47] hover:border-[#6554c0]/50"
                  }`}
                >
                  <div className="font-mono text-xs font-bold">{item.command}</div>
                  <div className={`text-[11px] mt-1 line-clamp-1 ${selectedCliIndex === idx ? "text-white/80" : "text-[#6b7280] dark:text-[#94a0bd]"}`}>
                    {item.desc[lang]}
                  </div>
                </button>
              ))}
            </div>

            {/* Interactive Terminal Output Simulator */}
            <div className="lg:col-span-7 rounded-[10px] bg-black/95 border border-[#2b304c] p-5 shadow-2xl font-mono text-xs text-white min-h-[220px]">
              <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-white/10 text-slate-400 text-[11px]">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono">bash - user@desktop:~</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-[#8b5cf6] font-bold">$</span>
                  <span className="text-white font-bold">{CLI_COMMANDS[selectedCliIndex].command}</span>
                </div>
                <div className="text-slate-400 text-[11px] leading-relaxed">
                  # {CLI_COMMANDS[selectedCliIndex].desc[lang]}
                </div>
                <pre className="text-emerald-400 text-xs whitespace-pre-wrap leading-relaxed pt-1">
                  {CLI_COMMANDS[selectedCliIndex].output}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Technical FAQ & Search Filter */}
        <div id="faq">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-[#6554c0]/15 text-[#6554c0] dark:text-[#a79be8] mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Questions & Answers</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white sm:text-4xl">
              {lang === "en" ? "Frequently Asked Questions" : "Pertanyaan yang Sering Diajukan"}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#4b5563] dark:text-[#a0a8c2]">
              {lang === "en"
                ? "Concrete answers about daemon lifecycle, WhatsApp video compatibility, and torrent imports."
                : "Jawaban teknis mengenai cara kerja background service, kompatibilitas video WhatsApp, dan torrent."}
            </p>

            {/* Live Search Input (Rule R-27) */}
            <div className="mt-6 relative max-w-md mx-auto">
              <Search className="w-4 h-4 text-[#9ca3af] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={lang === "en" ? "Filter FAQ (e.g. video, pause, daemon)..." : "Cari topik (misal: video, pause, daemon)..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-[8px] border text-xs sm:text-sm bg-white dark:bg-[#121424] border-[#d1d5db] dark:border-[#2d324d] text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6554c0]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 p-0.5 rounded text-[#9ca3af] hover:text-black dark:hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* FAQ Accordion List or Honest Empty State */}
          <div className="max-w-3xl mx-auto space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-[8px] border overflow-hidden transition-all"
                  style={{
                    backgroundColor: theme === "light" ? "#ffffff" : "rgba(18, 20, 36, 0.85)",
                    borderColor: theme === "light" ? "#e5e9f2" : "rgba(139, 92, 246, 0.2)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full py-4 px-5 text-left font-semibold text-xs sm:text-sm text-[#111827] dark:text-white flex items-center justify-between gap-4"
                    aria-expanded={expandedFaq === idx}
                  >
                    <span>{faq.q[lang]}</span>
                    {expandedFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-[#6554c0] dark:text-[#a79be8] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#9ca3af] flex-shrink-0" />
                    )}
                  </button>

                  {expandedFaq === idx && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-[#4b5563] dark:text-[#a0a8c2] leading-relaxed border-t pt-3"
                      style={{ borderColor: theme === "light" ? "#f1f5f9" : "rgba(139, 92, 246, 0.12)" }}
                    >
                      {faq.a[lang]}
                    </div>
                  )}
                </div>
              ))
            ) : (
              /* Honest Empty State (Rule R-27) */
              <div className="p-8 text-center rounded-[8px] border border-dashed border-[#d1d5db] dark:border-[#374151]">
                <div className="text-sm font-semibold text-[#111827] dark:text-white">
                  {lang === "en" ? `No FAQ matching "${searchQuery}"` : `Tidak ada FAQ untuk "${searchQuery}"`}
                </div>
                <p className="text-xs text-[#6b7280] dark:text-[#9ea4b5] mt-1">
                  {lang === "en" ? "Try searching for keywords like 'daemon', 'video', or 'resume'." : "Coba cari kata kunci seperti 'daemon', 'video', atau 'resume'."}
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-3 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#6554c0] text-white"
                >
                  {lang === "en" ? "Reset Search" : "Atur Ulang Pencarian"}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

