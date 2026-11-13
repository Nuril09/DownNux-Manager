import { useState } from "react";
import {
  Palette,
  FolderOpen,
  Gauge,
  Network,
  Bell,
  Check,
  Folder,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Zap,
  X,
} from "lucide-react";
import { translations, type Lang } from "../i18n";

export interface SettingsData {
  theme: "system" | "light" | "dark";
  accentColor: string;
  blurLevel: "high" | "low";
  language: "en" | "id";
  downloadDir: string;
  categoryDirs: {
    video: string;
    music: string;
    documents: string;
    compressed: string;
    programs: string;
    other: string;
  };
  rememberLastDir: boolean;
  speedLimiterEnabled: boolean;
  speedLimitBytesPerSec: number;
  defaultConnections: number;
  maxConcurrent: number;
  autoResumeOnStart: boolean;
  retryCount: number;
  showPreDownloadDialog: boolean;
  notifyOnStart: boolean;
  notifyOnComplete: boolean;
  soundOnComplete: boolean;
  onCompleteAction: "none" | "openFile" | "openFolder";
}

interface SettingsViewProps {
  lang: Lang;
  settings: SettingsData;
  onSave: (next: SettingsData) => void;
  onPreview?: (preview: Partial<SettingsData>) => void;
  onBrowseFolder: (targetField: string, currentPath?: string) => Promise<string | null>;
  onClose?: () => void;
}

export function SettingsView({
  lang,
  settings: initialSettings,
  onSave,
  onPreview,
  onBrowseFolder,
  onClose,
}: SettingsViewProps) {
  const t = translations[lang];
  const [activeSubTab, setActiveSubTab] = useState<
    "appearance" | "storage" | "speed" | "connection" | "popups"
  >("appearance");
  const [formData, setFormData] = useState<SettingsData>({ ...initialSettings });
  const [savedToast, setSavedToast] = useState(false);

  // Speed in MB/s for user friendly input
  const speedInMB = formData.speedLimitBytesPerSec > 0
    ? (formData.speedLimitBytesPerSec / (1024 * 1024)).toFixed(1).replace(".0", "")
    : "2";

  const handleSpeedChange = (valStr: string) => {
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setFormData({
        ...formData,
        speedLimitBytesPerSec: Math.round(num * 1024 * 1024),
      });
    } else {
      setFormData({
        ...formData,
        speedLimitBytesPerSec: 0,
      });
    }
  };

  const handleApplyPreset = (mbVal: number) => {
    setFormData({
      ...formData,
      speedLimiterEnabled: mbVal > 0,
      speedLimitBytesPerSec: mbVal * 1024 * 1024,
    });
  };

  const handleBrowse = async (field: string, current: string) => {
    const chosen = await onBrowseFolder(field, current);
    if (chosen) {
      if (field === "default") {
        setFormData((prev) => ({ ...prev, downloadDir: chosen }));
      } else {
        setFormData((prev) => ({
          ...prev,
          categoryDirs: {
            ...prev.categoryDirs,
            [field]: chosen,
          },
        }));
      }
    }
  };

  const handleSave = () => {
    onSave(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2400);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f7f8fa] dark:bg-[#12131a] select-none">
      {/* Top Header */}
      <div className="h-[52px] border-b border-[#e7e9ef] dark:border-[#2a2c3d] px-6 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-[#181926]/70 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-[#6554c0]" />
          <h2 className="text-[14px] font-bold text-[#202631] dark:text-white">
            {t.settingsTitle}
          </h2>
          <span className="text-[10px] text-[#6554c0] bg-[#edeaf9] dark:bg-[#6554c0]/20 dark:text-[#a79be8] px-2 py-0.5 rounded font-semibold">
            DownNux Engine · v0.0.4
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {savedToast && (
            <span className="text-[11px] font-medium text-[#218163] dark:text-[#38d49a] flex items-center gap-1 animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              {lang === "en" ? "Settings saved!" : "Pengaturan tersimpan!"}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-[6px] ios-button-primary text-[12px] font-medium shadow-sm flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.save}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[5px] hover:bg-[#e7e9ef] dark:hover:bg-[#25283b] flex items-center justify-center text-[#6e7685] hover:text-[#202631] dark:hover:text-white transition-colors"
              title="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Body: Left Sub-tabs + Right Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sub-nav */}
        <div className="w-[224px] border-r border-[#e7e9ef] dark:border-[#2a2c3d] p-3 space-y-1 flex-shrink-0 bg-white/40 dark:bg-[#161724]/40">
          {[
            { id: "appearance", label: t.tabAppearance, icon: Palette },
            { id: "storage", label: t.tabStorage, icon: FolderOpen },
            { id: "speed", label: t.tabSpeedLimit, icon: Gauge },
            { id: "connection", label: t.tabConnection, icon: Network },
            { id: "popups", label: t.tabPopups, icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as any)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-[6px] text-[12px] font-medium text-left transition-all ${
                  active
                    ? "bg-[#6554c0] text-white shadow-sm"
                    : "text-[#6e7685] hover:text-[#202631] dark:text-[#9ea4b5] dark:hover:text-white hover:bg-[#edeaf9]/50 dark:hover:bg-[#25283b]/60"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Form Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: APPEARANCE */}
          {activeSubTab === "appearance" && (
            <div className="max-w-2xl space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-[13px] font-bold text-[#202631] dark:text-white mb-1">
                  {t.themeMode}
                </h3>
                <p className="text-[11px] text-[#6e7685] dark:text-[#8f96a8] mb-3">
                  {lang === "en"
                    ? "Customize interface appearance and visionOS frosted glassmorphism."
                    : "Sesuaikan tampilan antarmuka dan efek kaca frosted glassmorphism."}
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: "system",
                      label: t.themeSystem,
                      desc: lang === "en" ? "Auto follows OS mode" : "Otomatis ikuti tema OS",
                      icon: Monitor,
                    },
                    {
                      id: "light",
                      label: t.themeLight,
                      desc: lang === "en" ? "Crisp white frosted glass" : "Kaca frosted putih cerah",
                      icon: Sun,
                    },
                    {
                      id: "dark",
                      label: t.themeDark,
                      desc: lang === "en" ? "Deep obsidian night frost" : "Kaca obsidian gelap pekat",
                      icon: Moon,
                    },
                  ].map((themeOpt) => {
                    const Icon = themeOpt.icon;
                    const isSelected = formData.theme === themeOpt.id;
                    return (
                      <button
                        key={themeOpt.id}
                        type="button"
                        onClick={() => {
                          const nextTheme = themeOpt.id as any;
                          setFormData((prev) => ({ ...prev, theme: nextTheme }));
                          onPreview?.({ theme: nextTheme });
                        }}
                        className={`p-3.5 rounded-[8px] border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? "bg-[#edeaf9] dark:bg-[#6554c0]/20 border-[#6554c0] shadow-sm"
                            : "bg-white dark:bg-[#1a1c29] border-[#e7e9ef] dark:border-[#2a2d40] hover:border-[#cfd3e0]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon
                            className={`w-4 h-4 ${
                              isSelected ? "text-[#6554c0] dark:text-[#a79be8]" : "text-[#6e7685]"
                            }`}
                          />
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-[#6554c0] dark:bg-[#a79be8]" />
                          )}
                        </div>
                        <div>
                          <div className="text-[12px] font-semibold text-[#202631] dark:text-white">
                            {themeOpt.label}
                          </div>
                          <div className="text-[10px] text-[#6e7685] dark:text-[#8f96a8] mt-0.5">
                            {themeOpt.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Glassmorphism Blur Mode */}
              <div className="pt-4 border-t border-[#e7e9ef] dark:border-[#2a2c3d]">
                <h3 className="text-[13px] font-bold text-[#202631] dark:text-white mb-1">
                  {t.blurLevel}
                </h3>
                <p className="text-[11px] text-[#6e7685] dark:text-[#8f96a8] mb-3">
                  {lang === "en"
                    ? "Control GPU backdrop-filter blur intensity."
                    : "Atur intensitas efek blur latar belakang."}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, blurLevel: "high" }));
                      onPreview?.({ blurLevel: "high" });
                    }}
                    className={`p-3 rounded-[8px] border text-left flex items-center space-x-3 transition-all ${
                      formData.blurLevel === "high"
                        ? "bg-[#edeaf9] dark:bg-[#6554c0]/20 border-[#6554c0]"
                        : "bg-white dark:bg-[#1a1c29] border-[#e7e9ef] dark:border-[#2a2d40]"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-[#6554c0]" />
                    <div>
                      <div className="text-[12px] font-semibold text-[#202631] dark:text-white">
                        {t.blurHigh}
                      </div>
                      <div className="text-[10px] text-[#6e7685] dark:text-[#8f96a8]">
                        32px backdrop filter depth
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, blurLevel: "low" }));
                      onPreview?.({ blurLevel: "low" });
                    }}
                    className={`p-3 rounded-[8px] border text-left flex items-center space-x-3 transition-all ${
                      formData.blurLevel === "low"
                        ? "bg-[#edeaf9] dark:bg-[#6554c0]/20 border-[#6554c0]"
                        : "bg-white dark:bg-[#1a1c29] border-[#e7e9ef] dark:border-[#2a2d40]"
                    }`}
                  >
                    <Zap className="w-4 h-4 text-[#6554c0]" />
                    <div>
                      <div className="text-[12px] font-semibold text-[#202631] dark:text-white">
                        {t.blurLow}
                      </div>
                      <div className="text-[10px] text-[#6e7685] dark:text-[#8f96a8]">
                        Lightweight mode for low-spec PCs
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Language Switch */}
              <div className="pt-4 border-t border-[#e7e9ef] dark:border-[#2a2c3d]">
                <h3 className="text-[13px] font-bold text-[#202631] dark:text-white mb-1">
                  {t.language}
                </h3>
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, language: "en" }));
                      onPreview?.({ language: "en" });
                    }}
                    className={`px-4 py-2 rounded-[6px] text-[12px] font-medium border transition-all ${
                      formData.language === "en"
                        ? "bg-[#6554c0] text-white border-[#5a4ab0] shadow-sm"
                        : "bg-white dark:bg-[#1a1c29] text-[#202631] dark:text-white border-[#e7e9ef] dark:border-[#2a2d40]"
                    }`}
                  >
                    🇺🇸 English (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, language: "id" }));
                      onPreview?.({ language: "id" });
                    }}
                    className={`px-4 py-2 rounded-[6px] text-[12px] font-medium border transition-all ${
                      formData.language === "id"
                        ? "bg-[#6554c0] text-white border-[#5a4ab0] shadow-sm"
                        : "bg-white dark:bg-[#1a1c29] text-[#202631] dark:text-white border-[#e7e9ef] dark:border-[#2a2d40]"
                    }`}
                  >
                    🇮🇩 Bahasa Indonesia
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FILE STORAGE & CATEGORY PATHS */}
          {activeSubTab === "storage" && (
            <div className="max-w-2xl space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-[13px] font-bold text-[#202631] dark:text-white mb-1">
                  {t.defaultFolder}
                </h3>
                <p className="text-[11px] text-[#6e7685] dark:text-[#8f96a8] mb-2">
                  {lang === "en"
                    ? "Base folder used for unclassified downloads."
                    : "Folder utama yang digunakan untuk unduhan standar."}
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={formData.downloadDir || "~/Downloads"}
                    onChange={(e) => setFormData({ ...formData, downloadDir: e.target.value })}
                    className="flex-1 bg-white dark:bg-[#1a1c29] border border-[#e7e9ef] dark:border-[#2a2d40] rounded-[6px] px-3 py-2 text-[#202631] dark:text-white text-[12px] font-mono focus:outline-none focus:border-[#6554c0]"
                  />
                  <button
                    type="button"
                    onClick={() => handleBrowse("default", formData.downloadDir)}
                    className="px-3.5 py-2 rounded-[6px] ios-glass-button text-[12px] font-medium flex items-center space-x-1.5 flex-shrink-0"
                  >
                    <Folder className="w-3.5 h-3.5 text-[#6554c0]" />
                    <span>{t.browseFolder}</span>
                  </button>
                </div>
              </div>

              {/* Category-specific download folders */}
              <div className="pt-4 border-t border-[#e7e9ef] dark:border-[#2a2c3d] space-y-3">
                <div>
                  <h3 className="text-[13px] font-bold text-[#202631] dark:text-white">
                    {t.categoryFolders}
                  </h3>
                  <p className="text-[11px] text-[#6e7685] dark:text-[#8f96a8]">
                    {lang === "en"
                      ? "Direct downloaded files automatically into specific folders by category."
                      : "Arahkan file unduhan secara otomatis ke folder khusus per kategori."}
                  </p>
                </div>

                {[
                  { key: "video", label: t.videoPath, placeholder: "~/Videos" },
                  { key: "music", label: t.musicPath, placeholder: "~/Music" },
                  { key: "documents", label: t.docsPath, placeholder: "~/Documents" },
                  { key: "compressed", label: t.archivesPath, placeholder: "~/Downloads/Compressed" },
                  { key: "programs", label: t.appsPath, placeholder: "~/Downloads/Programs" },
                ].map((cat) => (
                  <div key={cat.key} className="space-y-1">
                    <label className="text-[11px] font-medium text-[#6e7685] dark:text-[#9ea4b5]">
                      {cat.label}:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder={cat.placeholder}
                        value={(formData.categoryDirs as any)[cat.key] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            categoryDirs: {
                              ...formData.categoryDirs,
                              [cat.key]: e.target.value,
                            },
                          })
                        }
                        className="flex-1 bg-white dark:bg-[#1a1c29] border border-[#e7e9ef] dark:border-[#2a2d40] rounded-[6px] px-3 py-1.5 text-[#202631] dark:text-white text-[11px] font-mono focus:outline-none focus:border-[#6554c0]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleBrowse(cat.key, (formData.categoryDirs as any)[cat.key] || "")
                        }
                        className="px-3 py-1.5 rounded-[6px] ios-glass-button text-[11px] font-medium flex items-center space-x-1.5 flex-shrink-0"
                      >
                        <Folder className="w-3.5 h-3.5 text-[#6554c0]" />
                        <span>{t.browseFolder}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SPEED LIMITER */}
          {activeSubTab === "speed" && (
            <div className="max-w-xl space-y-5 animate-fadeIn">
              <div className="p-4 bg-white dark:bg-[#1a1c29] rounded-[8px] border border-[#e7e9ef] dark:border-[#2a2d40] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-bold text-[#202631] dark:text-white">
                      {t.enableSpeedLimiter}
                    </h3>
                    <p className="text-[11px] text-[#6e7685] dark:text-[#8f96a8] mt-0.5">
                      {t.speedLimiterDesc}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.speedLimiterEnabled}
                      onChange={(e) =>
                        setFormData({ ...formData, speedLimiterEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#e7e9ef] dark:bg-[#2a2d40] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6554c0]"></div>
                  </label>
                </div>

                {formData.speedLimiterEnabled && (
                  <div className="pt-3 border-t border-[#e7e9ef] dark:border-[#2a2d40] space-y-3">
                    <label className="block text-[12px] font-semibold text-[#202631] dark:text-white">
                      {t.maxSpeed} (MB/s):
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={speedInMB}
                        onChange={(e) => handleSpeedChange(e.target.value)}
                        className="w-32 bg-white dark:bg-[#12131a] border border-[#e7e9ef] dark:border-[#2a2d40] rounded-[6px] px-3 py-2 text-[#202631] dark:text-white text-[14px] font-bold text-center focus:outline-none focus:border-[#6554c0]"
                      />
                      <span className="text-[12px] font-semibold text-[#6e7685]">MB/s</span>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-medium text-[#6e7685]">
                        {lang === "en" ? "Quick Presets:" : "Pilihan Cepat:"}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[0.5, 1, 2, 5, 10, 20].map((mb) => (
                          <button
                            key={mb}
                            type="button"
                            onClick={() => handleApplyPreset(mb)}
                            className="px-2.5 py-1 rounded-[5px] bg-[#f7f8fa] dark:bg-[#25283b] hover:bg-[#edeaf9] dark:hover:bg-[#343850] text-[#202631] dark:text-white text-[11px] font-medium border border-[#e7e9ef] dark:border-[#2a2d40] transition-colors"
                          >
                            {mb} MB/s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CONNECTION & ENGINE */}
          {activeSubTab === "connection" && (
            <div className="max-w-xl space-y-5 animate-fadeIn">
              <div className="p-4 bg-white dark:bg-[#1a1c29] rounded-[8px] border border-[#e7e9ef] dark:border-[#2a2d40] space-y-4">
                {/* Default Connections */}
                <div>
                  <h3 className="text-[12px] font-bold text-[#202631] dark:text-white mb-1">
                    {t.connsPerDownload}
                  </h3>
                  <p className="text-[11px] text-[#6e7685] dark:text-[#8f96a8] mb-2.5">
                    {lang === "en"
                      ? "Number of simultaneous segmented HTTP connections per file (Recommended: 8)."
                      : "Jumlah segmen koneksi HTTP simultan per file (Rekomendasi: 8 koneksi)."}
                  </p>
                  <div className="flex items-center space-x-2">
                    {[1, 4, 8, 16, 32].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFormData({ ...formData, defaultConnections: n })}
                        className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold border transition-all ${
                          formData.defaultConnections === n
                            ? "bg-[#6554c0] text-white border-[#5a4ab0] shadow-sm"
                            : "bg-[#f7f8fa] dark:bg-[#25283b] text-[#202631] dark:text-white border-[#e7e9ef] dark:border-[#2a2d40]"
                        }`}
                      >
                        {n} {lang === "en" ? "conns" : "koneksi"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max Concurrent Downloads */}
                <div className="pt-3 border-t border-[#e7e9ef] dark:border-[#2a2d40]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[12px] font-bold text-[#202631] dark:text-white">
                      {t.maxActiveDownloads}
                    </h3>
                    <span className="font-bold text-[12px] text-[#6554c0]">
                      {formData.maxConcurrent}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.maxConcurrent}
                    onChange={(e) =>
                      setFormData({ ...formData, maxConcurrent: parseInt(e.target.value) || 3 })
                    }
                    className="w-full accent-[#6554c0] cursor-pointer"
                  />
                </div>

                {/* Auto Resume */}
                <div className="pt-3 border-t border-[#e7e9ef] dark:border-[#2a2d40] flex items-center justify-between">
                  <div>
                    <h3 className="text-[12px] font-bold text-[#202631] dark:text-white">
                      {t.autoResume}
                    </h3>
                    <p className="text-[10px] text-[#6e7685] dark:text-[#8f96a8]">
                      {t.autoResumeDesc}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoResumeOnStart}
                    onChange={(e) =>
                      setFormData({ ...formData, autoResumeOnStart: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#6554c0] accent-[#6554c0]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: POPUPS & NOTIFICATIONS */}
          {activeSubTab === "popups" && (
            <div className="max-w-xl space-y-5 animate-fadeIn">
              <div className="p-4 bg-white dark:bg-[#1a1c29] rounded-[8px] border border-[#e7e9ef] dark:border-[#2a2d40] space-y-4">
                {/* Pre-download Dialog */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[12px] font-bold text-[#202631] dark:text-white">
                      {t.showPreDownload}
                    </h3>
                    <p className="text-[10px] text-[#6e7685] dark:text-[#8f96a8]">
                      {lang === "en"
                        ? "Inspect filename, estimated size, and choose folder before download starts."
                        : "Periksa nama file, estimasi ukuran, dan ganti folder sebelum mulai."}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.showPreDownloadDialog}
                    onChange={(e) =>
                      setFormData({ ...formData, showPreDownloadDialog: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#6554c0] accent-[#6554c0]"
                  />
                </div>

                {/* Notify on Start */}
                <div className="pt-3 border-t border-[#e7e9ef] dark:border-[#2a2d40] flex items-center justify-between">
                  <div>
                    <h3 className="text-[12px] font-bold text-[#202631] dark:text-white">
                      {t.notifyStart}
                    </h3>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notifyOnStart}
                    onChange={(e) => setFormData({ ...formData, notifyOnStart: e.target.checked })}
                    className="w-4 h-4 rounded text-[#6554c0] accent-[#6554c0]"
                  />
                </div>

                {/* Notify on Complete */}
                <div className="pt-3 border-t border-[#e7e9ef] dark:border-[#2a2d40] flex items-center justify-between">
                  <div>
                    <h3 className="text-[12px] font-bold text-[#202631] dark:text-white">
                      {t.notifyDone}
                    </h3>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notifyOnComplete}
                    onChange={(e) =>
                      setFormData({ ...formData, notifyOnComplete: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#6554c0] accent-[#6554c0]"
                  />
                </div>

                {/* Action on Complete */}
                <div className="pt-3 border-t border-[#e7e9ef] dark:border-[#2a2d40] space-y-2">
                  <h3 className="text-[12px] font-bold text-[#202631] dark:text-white">
                    {t.actionAfterComplete}
                  </h3>
                  <div className="space-y-1.5">
                    {[
                      { id: "none", label: t.actionNone },
                      { id: "openFile", label: t.actionOpenFile },
                      { id: "openFolder", label: t.actionOpenFolder },
                    ].map((act) => (
                      <label key={act.id} className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="onCompleteAction"
                          checked={formData.onCompleteAction === act.id}
                          onChange={() =>
                            setFormData({ ...formData, onCompleteAction: act.id as any })
                          }
                          className="accent-[#6554c0]"
                        />
                        <span className="text-[12px] text-[#202631] dark:text-white">
                          {act.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
