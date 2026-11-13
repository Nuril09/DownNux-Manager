import { useState } from "react";
import {
  X,
  RefreshCw,
  CheckCircle2,
  ArrowUpCircle,
  ExternalLink,
  Zap,
  Loader2,
  Sparkles,
} from "lucide-react";
import { type Lang, translations } from "../i18n";

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName?: string;
  releaseUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
  assets?: Array<{ name: string; size: number; downloadUrl: string }>;
  isDev?: boolean;
}

interface UpdateModalProps {
  lang: Lang;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  onCheck: () => void;
  onClose: () => void;
}

export function UpdateModal({
  lang,
  updateInfo,
  isChecking,
  onCheck,
  onClose,
}: UpdateModalProps) {
  const t = translations[lang];
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);

  const handleRebuild = async () => {
    setIsRebuilding(true);
    setRebuildStatus(t.rebuildingDev);
    try {
      await fetch("http://127.0.0.1:44990/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "app.rebuildDev", params: {} }),
      });
      setTimeout(() => {
        setRebuildStatus(t.rebuildDone);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }, 3500);
    } catch {
      setIsRebuilding(false);
      setRebuildStatus(lang === "en" ? "Failed to trigger rebuild" : "Gagal memicu rebuild");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 dark:bg-[#181a28]/95 backdrop-blur-2xl border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[12px] w-full max-w-md p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e7e9ef] dark:border-[#2a2c3d] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-[#6554c0] flex items-center justify-center text-white p-1 shadow-sm shadow-[#6554c0]/30">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-[#202631] dark:text-white">
                {t.checkForUpdates}
              </h2>
              <p className="text-[10px] text-[#6e7685] dark:text-[#9ea4b5]">
                DownNux Manager Updater
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-[#f7f8fa] dark:hover:bg-[#25283b] flex items-center justify-center text-[#6e7685] hover:text-[#202631] dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          {/* Version status banner */}
          <div className="p-4 rounded-[10px] bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-[8px] bg-white dark:bg-[#1a1c29] border border-[#e7e9ef] dark:border-[#2a2c3d] flex items-center justify-center flex-shrink-0 p-1.5 shadow-xs">
              <img src="/app-icon.png" alt="DownNux" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[12px] text-[#202631] dark:text-white">
                  DownNux Manager
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#edeaf9] dark:bg-[#6554c0]/20 text-[#6554c0] dark:text-[#a79be8] font-bold">
                  v{updateInfo?.currentVersion || "0.0.4"}
                </span>
              </div>
              <div className="text-[11px] mt-1 text-[#6e7685] dark:text-[#9ea4b5]">
                {isChecking ? (
                  <span className="flex items-center gap-1.5 text-[#6554c0] dark:text-[#a79be8] font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t.checkingUpdates}
                  </span>
                ) : updateInfo?.hasUpdate ? (
                  <span className="flex items-center gap-1.5 text-[#eab308] dark:text-[#facc15] font-semibold">
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    {t.updateAvailable} (v{updateInfo.latestVersion})
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[#218163] dark:text-[#38d49a] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t.upToDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Release Notes if update available */}
          {updateInfo?.hasUpdate && updateInfo.releaseNotes && (
            <div className="p-3 bg-[#edeaf9]/30 dark:bg-[#6554c0]/10 border border-[#d8d2f5] dark:border-[#4d4287] rounded-[8px] space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6554c0] dark:text-[#a79be8] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {t.releaseNotes} ({updateInfo.releaseName || `v${updateInfo.latestVersion}`})
              </span>
              <p className="text-[11px] text-[#202631] dark:text-[#d1d5e0] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
                {updateInfo.releaseNotes}
              </p>
            </div>
          )}

          {/* Dev Quick Rebuild / Power User Section */}
          {updateInfo?.isDev && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[8px] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {lang === "en" ? "Development Workspace Active" : "Mode Pengembang Aktif"}
                </span>
                <span className="text-[10px] text-[#6e7685] dark:text-[#9ea4b5]">Local Git Source</span>
              </div>
              <p className="text-[10px] text-[#6e7685] dark:text-[#9ea4b5] leading-relaxed">
                {lang === "en"
                  ? "You can test code edits instantly by compiling and reloading without running terminal commands."
                  : "Kamu bisa langsung meng-compile kode baru dan me-reload aplikasi secara instan tanpa perlu mengetik di terminal."}
              </p>
              <button
                type="button"
                disabled={isRebuilding}
                onClick={handleRebuild}
                className="w-full py-1.5 px-3 rounded-[6px] bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium flex items-center justify-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {isRebuilding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{rebuildStatus || t.rebuildingDev}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>{t.rebuildDev}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#e7e9ef] dark:border-[#2a2c3d]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[6px] bg-[#f7f8fa] dark:bg-[#1a1c29] hover:bg-[#e7e9ef] dark:hover:bg-[#25283b] text-[#202631] dark:text-white text-[12px] font-medium"
          >
            {t.close}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isChecking}
              onClick={onCheck}
              className="px-3.5 py-1.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#6554c0] dark:text-[#a79be8] ${isChecking ? "animate-spin" : ""}`} />
              <span>{t.checkForUpdates}</span>
            </button>

            {updateInfo?.hasUpdate && updateInfo.releaseUrl && (
              <a
                href={updateInfo.releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-[6px] ios-button-primary text-white text-[12px] font-medium flex items-center space-x-1.5 shadow-sm"
              >
                <span>{t.downloadUpdate}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

