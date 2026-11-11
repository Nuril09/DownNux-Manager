import { useState, useEffect } from "react";
import {
  Download,
  Play,
  Pause,
  XCircle,
  Trash2,
  Settings as SettingsIcon,
  Plus,
  Folder,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Film,
  Music,
  FileText,
  Archive,
  Binary,
  Languages,
  PauseCircle,
  Search,
  Minimize2,
  Square,
  X,
  FolderOpen,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { translations, type Lang } from "./i18n";

export interface Task {
  id: string;
  url: string;
  dir: string;
  filename: string;
  status: "queued" | "downloading" | "paused" | "retrying" | "merging" | "completed" | "failed" | "canceled";
  totalBytes: number;
  completedBytes: number;
  speed: number;
  connections: number;
  activeConnections: number;
  createdAt: number;
  updatedAt: number;
  error?: { code: string; message: string } | null;
}

function fmtBytes(n: number): string {
  if (!n || n <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`.replace(".", ",");
}

function fmtTime(sec: number, lang: Lang = "en"): string {
  if (!isFinite(sec) || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)} ${lang === "en" ? "s" : "d"}`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return `${m} ${lang === "en" ? "m" : "m"} ${s} ${lang === "en" ? "s" : "d"}`;
  const h = Math.floor(m / 60);
  return `${h} ${lang === "en" ? "h" : "j"} ${m % 60} ${lang === "en" ? "m" : "m"}`;
}

function getCategory(filename: string): "video" | "music" | "documents" | "compressed" | "programs" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["mp4", "mkv", "webm", "avi", "mov", "flv"].includes(ext)) return "video";
  if (["mp3", "flac", "wav", "m4a", "aac", "ogg", "opus"].includes(ext)) return "music";
  if (["pdf", "docx", "doc", "xlsx", "pptx", "txt", "epub"].includes(ext)) return "documents";
  if (["zip", "tar", "gz", "7z", "rar", "bz2", "xz"].includes(ext)) return "compressed";
  if (["deb", "rpm", "appimage", "sh", "exe", "iso", "bin", "dmg"].includes(ext)) return "programs";
  return "other";
}

function getFileIcon(filename: string) {
  const cat = getCategory(filename);
  switch (cat) {
    case "video":
      return Film;
    case "music":
      return Music;
    case "documents":
      return FileText;
    case "compressed":
      return Archive;
    case "programs":
      return Binary;
    default:
      return Folder;
  }
}

export function App() {
  // User Requirement: English is DEFAULT language
  const [lang, setLang] = useState<Lang>("en");
  const t = translations[lang];

  const [osName, setOsName] = useState<string>("Ubuntu · Desktop");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  // Form states
  const [newUrl, setNewUrl] = useState("");
  const [newFilename, setNewFilename] = useState("");
  const [newConnections, setNewConnections] = useState(8);
  const [downloadFormat, setDownloadFormat] = useState<"mp4" | "mp3">("mp4");

  const isMediaUrl = /youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|twitter\.com|x\.com|instagram\.com|twitch\.tv|dailymotion\.com|reddit\.com|facebook\.com/i.test(newUrl);

  const handleUrlChange = (val: string) => {
    setNewUrl(val);
    try {
      const u = new URL(val);
      if (/youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|twitter\.com|x\.com|instagram\.com|twitch\.tv|dailymotion\.com|reddit\.com|facebook\.com/i.test(u.hostname)) {
        if (!newFilename || newFilename === "video.mp4" || newFilename === "audio.mp3") {
          setNewFilename("");
        }
      } else {
        const lastPart = u.pathname.split("/").filter(Boolean).pop();
        if (lastPart && lastPart.includes(".")) {
          setNewFilename(decodeURIComponent(lastPart));
        }
      }
    } catch {}
  };

  // Fetch dynamic OS info from daemon
  useEffect(() => {
    fetch("http://127.0.0.1:44990/api/sysinfo")
      .then((r) => r.json())
      .then((data) => {
        if (data?.os) setOsName(`${data.os} · Desktop`);
      })
      .catch(() => {});
  }, []);

  // Poll daemon RPC tasks & subscribe
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch("http://127.0.0.1:44990/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "task.list", params: {} }),
        });
        const json = await res.json();
        if (json.result && Array.isArray(json.result)) {
          setTasks(json.result);
          if (!selectedId && json.result.length > 0) {
            setSelectedId(json.result[0].id);
          }
        }
      } catch {}
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 1500);
    return () => clearInterval(interval);
  }, [selectedId]);

  const executeAction = async (method: string, params: Record<string, unknown> = {}) => {
    try {
      await fetch("http://127.0.0.1:44990/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDownload = async () => {
    if (!newUrl) return;
    await executeAction("task.add", {
      url: newUrl,
      filename: newFilename || undefined,
      connections: newConnections,
      headers: {
        format: downloadFormat === "mp3" ? "audio" : "video",
      },
      start: true,
    });
    setIsAddOpen(false);
    setNewUrl("");
    setNewFilename("");
    setDownloadFormat("mp4");
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      (task.filename || task.url).toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory) {
      return getCategory(task.filename || task.url) === activeCategory;
    }
    if (activeFilter === "downloading") return task.status === "downloading" || task.status === "retrying";
    if (activeFilter === "completed") return task.status === "completed";
    if (activeFilter === "queued") return task.status === "queued";
    if (activeFilter === "paused") return task.status === "paused";
    if (activeFilter === "failed") return task.status === "failed";
    return true;
  });

  const selectedTask = tasks.find((t) => t.id === selectedId) || tasks[0];
  const totalSpeed = tasks
    .filter((t) => t.status === "downloading")
    .reduce((sum, t) => sum + (t.speed || 0), 0);

  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "id" : "en"));
  };

  const getStatusText = (status: Task["status"]) => {
    if (lang === "en") {
      switch (status) {
        case "downloading": return "Downloading";
        case "completed": return "Completed";
        case "paused": return "Paused";
        case "failed": return "Failed";
        case "queued": return "Queued";
        case "merging": return "Merging";
        case "retrying": return "Retrying";
        default: return status;
      }
    }
    switch (status) {
      case "downloading": return "Mengunduh";
      case "completed": return "Selesai";
      case "paused": return "Dijeda";
      case "failed": return "Gagal";
      case "queued": return "Dalam antrean";
      case "merging": return "Menggabungkan";
      case "retrying": return "Mencoba lagi";
      default: return status;
    }
  };

  return (
    <div className="ios-glass-canvas h-screen w-screen p-2 sm:p-3 flex flex-col box-border overflow-hidden select-none">
      {/* WINDOW CONTAINER: Rounded 12px with Frosted Glassmorphism iOS Depth */}
      <div className="ios-glass-window rounded-[12px] flex flex-col flex-1 overflow-hidden relative shadow-2xl">
        
        {/* 1. BILAH JUDUL (Exact Figma node 2:3, h: 48px, bg: #f7f8fa) */}
        <header className="h-[48px] ios-glass-bar border-b border-[#e7e9ef] flex items-center justify-between px-4 relative z-30 flex-shrink-0">
          <div className="flex items-center space-x-3">
            {/* Custom Icon user dengan container rounded 6px ungu #6554c0 */}
            <div className="w-6 h-6 rounded-[6px] bg-[#6554c0] flex items-center justify-center p-0.5 shadow-sm shadow-[#6554c0]/30 overflow-hidden">
              <img src="/app-icon.png" alt="DownNux" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-[12px] text-[#202631] tracking-tight">DownNux Manager</span>
          </div>

          {/* Dynamic OS indicator matching Figma node 2:18 "Ubuntu · Desktop" */}
          <div className="absolute left-1/2 -translate-x-1/2 font-normal text-[11px] text-[#6e7685]">
            {osName}
          </div>

          {/* Language Switch & Window Control Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-[6px] border border-[#e7e9ef] bg-white text-[#6e7685] hover:text-[#202631] hover:border-[#d0d3de] transition-colors"
              title={lang === "en" ? "Change Language" : "Ganti Bahasa"}
            >
              <Languages className="w-3.5 h-3.5 text-[#6554c0]" />
              <span className="font-semibold">{lang.toUpperCase()}</span>
            </button>

            <div className="h-4 w-[1px] bg-[#e7e9ef]" />

            <div className="flex items-center space-x-2 text-[#6e7685]">
              <button
                className="w-5 h-5 rounded hover:bg-[#e7e9ef] flex items-center justify-center transition-colors"
                title={lang === "en" ? "Minimize" : "Kecilkan"}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                className="w-5 h-5 rounded hover:bg-[#e7e9ef] flex items-center justify-center transition-colors"
                title={lang === "en" ? "Maximize" : "Besarkan"}
              >
                <Square className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsExitDialogOpen(true)}
                className="w-5 h-5 rounded hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors"
                title={lang === "en" ? "Close" : "Tutup"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* 2. MAIN LAYOUT: SIDEBAR + WORKSPACE */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* NAVIGASI (Sidebar Figma w: 216px, bg: #f7f8fa) */}
          <aside className="w-[216px] ios-glass-sidebar border-r border-[#e7e9ef] flex flex-col justify-between p-3 flex-shrink-0 z-20">
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* PUSTAKA / LIBRARY */}
              <div>
                <div className="text-[10px] font-semibold text-[#6e7685] tracking-wider uppercase px-2 mb-1.5">
                  {lang === "en" ? "LIBRARY" : "PUSTAKA"}
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: "all", label: t.allDownloads, icon: Layers, count: tasks.length },
                    {
                      id: "downloading",
                      label: t.downloading,
                      icon: Download,
                      count: tasks.filter((t) => t.status === "downloading" || t.status === "retrying").length,
                    },
                    {
                      id: "completed",
                      label: t.completed,
                      icon: CheckCircle2,
                      count: tasks.filter((t) => t.status === "completed").length,
                    },
                    {
                      id: "queued",
                      label: t.queued,
                      icon: Clock,
                      count: tasks.filter((t) => t.status === "queued").length,
                    },
                    {
                      id: "failed",
                      label: t.failed,
                      icon: AlertCircle,
                      count: tasks.filter((t) => t.status === "failed").length,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = !activeCategory && activeFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveFilter(item.id);
                          setActiveCategory(null);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-[12px] transition-all ${
                          active
                            ? "bg-[#edeaf9] text-[#6554c0] font-semibold"
                            : "text-[#202631] hover:bg-[#edeaf9]/40 hover:text-[#6554c0]"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 ${active ? "text-[#6554c0]" : "text-[#6e7685]"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.count > 0 && (
                          <span className={`text-[11px] font-mono ${active ? "text-[#6554c0]" : "text-[#6e7685]"}`}>
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KATEGORI / CATEGORIES */}
              <div>
                <div className="text-[10px] font-semibold text-[#6e7685] tracking-wider uppercase px-2 mb-1.5">
                  {lang === "en" ? "CATEGORIES" : "KATEGORI"}
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: "video", label: t.video, icon: Film },
                    { id: "music", label: t.music, icon: Music },
                    { id: "documents", label: t.documents, icon: FileText },
                    { id: "compressed", label: t.compressed, icon: Archive },
                    { id: "programs", label: t.programs, icon: Binary },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const active = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-[6px] text-[12px] transition-all ${
                          active
                            ? "bg-[#edeaf9] text-[#6554c0] font-semibold"
                            : "text-[#6e7685] hover:bg-[#edeaf9]/40 hover:text-[#202631]"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-[#6e7685]" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pemisah menu */}
              <div className="h-px bg-[#e7e9ef] my-2" />

              <div className="space-y-0.5">
                <button
                  onClick={() => {}}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-[#202631] hover:bg-[#edeaf9]/40 transition-colors"
                >
                  <Clock className="w-4 h-4 text-[#6e7685]" />
                  <span>{lang === "en" ? "Scheduler" : "Penjadwal"}</span>
                </button>
                <button
                  onClick={() => {}}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-[#202631] hover:bg-[#edeaf9]/40 transition-colors"
                >
                  <SettingsIcon className="w-4 h-4 text-[#6e7685]" />
                  <span>{t.settings}</span>
                </button>
              </div>
            </div>

            {/* Koneksi browser (Exact Figma node 2:90: bg: #eef4f1, text: #218163) */}
            <div className="bg-[#eef4f1] p-3 rounded-[8px] border border-[#d6e7dc]/70 mt-2">
              <p className="font-medium text-[11px] text-[#218163] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#218163] inline-block animate-pulse" />
                {lang === "en" ? "Browser Connected" : "Browser terhubung"}
              </p>
              <p className="font-normal text-[10px] text-[#6e7685] mt-1">
                {lang === "en" ? "Chrome / Brave · Ready to capture" : "Chrome · Siap menangkap URL"}
              </p>
            </div>
          </aside>

          {/* AREA KERJA (Workspace) */}
          <main className="flex-1 flex flex-col overflow-hidden bg-white/95">
            {/* Header Area Kerja: Judul, Subtitle, Search */}
            <div className="p-6 pb-3 space-y-4 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[24px] font-semibold text-[#202631] leading-tight">
                    {t.allDownloads}
                  </h2>
                  <p className="text-[12px] text-[#6e7685] mt-1">
                    {lang === "en"
                      ? "Manage your downloads. Fast, organized, uninterrupted."
                      : "Kelola unduhanmu. Cepat, teratur, tanpa terputus."}
                  </p>
                </div>

                {/* Pencarian (Figma w: 308px, h: 36px, bg: #f7f8fa) */}
                <div className="relative w-[308px] h-[36px] bg-[#f7f8fa] rounded-[6px] border border-[#e7e9ef] flex items-center px-3 shadow-inner">
                  <Search className="w-4 h-4 text-[#6e7685] mr-2" />
                  <input
                    type="text"
                    placeholder={lang === "en" ? "Search file name or URL..." : "Cari nama file atau URL..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-[12px] text-[#202631] placeholder-[#6e7685] focus:outline-none w-full"
                  />
                  <span className="text-[10px] text-[#6e7685] font-mono ml-1">Ctrl K</span>
                </div>
              </div>

              {/* Toolbar Tombol (Exact Figma: Tambah URL bg #6554c0, yang lain ios-glass-button border #e7e9ef) */}
              <div className="flex items-center space-x-2 pt-1 overflow-x-auto">
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="h-[36px] px-4 rounded-[6px] ios-button-primary text-[12px] font-medium flex items-center space-x-2 shadow-sm flex-shrink-0"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>{t.addUrl}</span>
                </button>

                <button
                  disabled={!selectedTask || selectedTask.status !== "paused"}
                  onClick={() => selectedTask && executeAction("task.resume", { id: selectedTask.id })}
                  className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] text-[12px] font-medium flex items-center space-x-2 disabled:opacity-40 flex-shrink-0"
                >
                  <Play className="w-4 h-4 text-[#202631]" />
                  <span>{t.resume}</span>
                </button>

                <button
                  disabled={!selectedTask || selectedTask.status !== "downloading"}
                  onClick={() => selectedTask && executeAction("task.pause", { id: selectedTask.id })}
                  className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] text-[12px] font-medium flex items-center space-x-2 disabled:opacity-40 flex-shrink-0"
                >
                  <Pause className="w-4 h-4 text-[#202631]" />
                  <span>{t.pause}</span>
                </button>

                <button
                  disabled={!selectedTask || selectedTask.status === "completed"}
                  onClick={() => selectedTask && executeAction("task.cancel", { id: selectedTask.id })}
                  className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] text-[12px] font-medium flex items-center space-x-2 disabled:opacity-40 flex-shrink-0"
                >
                  <XCircle className="w-4 h-4 text-[#202631]" />
                  <span>{t.cancel}</span>
                </button>

                <button
                  disabled={!selectedTask}
                  onClick={() => selectedTask && executeAction("task.remove", { id: selectedTask.id, deleteFile: false })}
                  className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] text-[12px] font-medium flex items-center space-x-2 disabled:opacity-40 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-[#202631]" />
                  <span>{t.delete}</span>
                </button>

                <button
                  onClick={() => executeAction("task.pauseAll")}
                  className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] text-[12px] font-medium flex items-center space-x-2 flex-shrink-0"
                >
                  <PauseCircle className="w-4 h-4 text-[#202631]" />
                  <span>{t.pauseAll}</span>
                </button>

                <div className="flex-1" />

                <button className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] text-[12px] font-medium flex items-center space-x-2 flex-shrink-0">
                  <Clock className="w-4 h-4 text-[#6e7685]" />
                  <span>{lang === "en" ? "Recent" : "Terbaru"}</span>
                </button>
              </div>

              {/* Filter Tabs (Exact Figma: "All" with indicator line #6554c0, "Active", "Completed") */}
              <div className="flex items-center justify-between pt-2 border-b border-[#e7e9ef]">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`pb-2 text-[12px] relative transition-colors ${
                      activeFilter === "all" ? "text-[#6554c0] font-semibold" : "text-[#6e7685] hover:text-[#202631]"
                    }`}
                  >
                    {lang === "en" ? "All" : "Semua"}
                    <span className="text-[10px] text-[#6e7685] font-normal ml-1.5">{tasks.length}</span>
                    {activeFilter === "all" && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6554c0]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveFilter("downloading")}
                    className={`pb-2 text-[12px] relative transition-colors ${
                      activeFilter === "downloading"
                        ? "text-[#6554c0] font-semibold"
                        : "text-[#6e7685] hover:text-[#202631]"
                    }`}
                  >
                    {lang === "en" ? "Active" : "Aktif"}
                    {activeFilter === "downloading" && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6554c0]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveFilter("completed")}
                    className={`pb-2 text-[12px] relative transition-colors ${
                      activeFilter === "completed"
                        ? "text-[#6554c0] font-semibold"
                        : "text-[#6e7685] hover:text-[#202631]"
                    }`}
                  >
                    {lang === "en" ? "Completed" : "Selesai"}
                    {activeFilter === "completed" && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6554c0]" />
                    )}
                  </button>
                </div>
                <span className="text-[11px] text-[#6e7685]">
                  {selectedTask ? (lang === "en" ? "1 selected" : "1 dipilih") : (lang === "en" ? "0 selected" : "0 dipilih")}
                </span>
              </div>
            </div>

            {/* TABEL DAFTAR UNDUHAN (Exact Figma border #e7e9ef, header #f7f8fa) */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <div className="border border-[#e7e9ef] rounded-[6px] overflow-hidden ios-glass-card">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#f7f8fa] text-[#6e7685] font-medium border-b border-[#e7e9ef] text-[10px]">
                      <th className="py-2.5 px-4 w-80">{t.filename}</th>
                      <th className="py-2.5 px-3 w-28">{t.size}</th>
                      <th className="py-2.5 px-3 w-40">{t.status} / {t.progress}</th>
                      <th className="py-2.5 px-3 w-28">{t.speed}</th>
                      <th className="py-2.5 px-3 w-24">{t.eta}</th>
                      <th className="py-2.5 px-3 w-32">{t.added}</th>
                      <th className="py-2.5 px-3 text-right">{lang === "en" ? "Action" : "Aksi"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e9ef]">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#6e7685]">
                          <Folder className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#6554c0]" />
                          <p className="text-[12px] font-medium text-[#202631]">
                            {lang === "en" ? "No downloads in this list" : "Tidak ada unduhan di daftar ini"}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const isSelected = selectedTask?.id === task.id;
                        const pct = task.totalBytes > 0 ? (task.completedBytes / task.totalBytes) * 100 : 0;
                        const remainingBytes = task.totalBytes - task.completedBytes;
                        const etaSec = task.speed > 0 ? remainingBytes / task.speed : 0;
                        const FileIcon = getFileIcon(task.filename || task.url);

                        let hostname = "";
                        try {
                          hostname = new URL(task.url).hostname;
                        } catch {
                          hostname = task.url;
                        }

                        return (
                          <tr
                            key={task.id}
                            onClick={() => setSelectedId(task.id)}
                            className={`cursor-pointer transition-colors relative ${
                              isSelected ? "bg-[#f3f0fc]" : "hover:bg-[#fbfbfd] bg-white"
                            }`}
                          >
                            <td className="py-2.5 px-4 max-w-xs relative">
                              {/* Penanda pilihan ungu #6554c0 */}
                              {isSelected && (
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#6554c0]" />
                              )}
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? "bg-[#e5def8]" : "bg-[#f1f3f6]"
                                  }`}
                                >
                                  <FileIcon
                                    className={`w-4 h-4 ${isSelected ? "text-[#6554c0]" : "text-[#6e7685]"}`}
                                  />
                                </div>
                                <div className="truncate">
                                  <p className="font-semibold text-[11px] text-[#202631] truncate">
                                    {task.filename || task.url}
                                  </p>
                                  <p className="text-[9px] text-[#6e7685] truncate">
                                    {hostname}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-[#202631] whitespace-nowrap">
                              {fmtBytes(task.totalBytes || task.completedBytes)}
                            </td>

                            {/* Status & Progress bar (Figma: bar bg #e3e4ea, fill #6554c0) */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex justify-between items-center mb-1">
                                <span
                                  className={`font-medium text-[10px] ${
                                    task.status === "completed"
                                      ? "text-[#218163]"
                                      : task.status === "paused"
                                      ? "text-[#ac8433]"
                                      : task.status === "failed"
                                      ? "text-[#c34a4a]"
                                      : "text-[#6554c0]"
                                  }`}
                                >
                                  {getStatusText(task.status)}
                                </span>
                                <span className="font-normal text-[10px] text-[#6554c0]">
                                  {task.status === "completed" ? "100%" : `${pct.toFixed(0)}%`}
                                </span>
                              </div>
                              <div className="w-[142px] h-[4px] bg-[#e3e4ea] rounded-[2px] overflow-hidden">
                                <div
                                  className={`h-full rounded-[2px] transition-all duration-300 ${
                                    task.status === "completed"
                                      ? "bg-[#218163]"
                                      : task.status === "paused"
                                      ? "bg-[#ac8433]"
                                      : task.status === "failed"
                                      ? "bg-[#c34a4a]"
                                      : "bg-[#6554c0]"
                                  }`}
                                  style={{ width: `${task.status === "completed" ? 100 : Math.min(100, pct)}%` }}
                                />
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-[#202631] whitespace-nowrap">
                              {task.status === "downloading" ? `${fmtBytes(task.speed)}/s` : "—"}
                            </td>

                            <td className="py-2.5 px-3 text-[#6e7685] whitespace-nowrap">
                              {task.status === "downloading" ? fmtTime(etaSec, lang) : "—"}
                            </td>

                            <td className="py-2.5 px-3 text-[#6e7685] text-[10px] whitespace-nowrap">
                              {lang === "en" ? "Today" : "Hari ini"}, {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (task.status === "downloading") executeAction("task.pause", { id: task.id });
                                  else if (task.status === "paused") executeAction("task.resume", { id: task.id });
                                  else if (task.status === "failed") executeAction("task.retry", { id: task.id });
                                }}
                                className="w-6 h-6 rounded hover:bg-[#edeaf9] inline-flex items-center justify-center text-[#6554c0] transition-colors"
                              >
                                {task.status === "downloading" ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : task.status === "failed" ? (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer: Menampilkan X dari Y unduhan & Link Lihat semua */}
              <div className="flex items-center justify-between text-[10px] text-[#6e7685] mt-2 px-1">
                <span>
                  {lang === "en"
                    ? `Showing ${filteredTasks.length} of ${tasks.length} downloads`
                    : `Menampilkan ${filteredTasks.length} dari ${tasks.length} unduhan`}
                </span>
                <button
                  onClick={() => setActiveFilter("all")}
                  className="text-[#6554c0] font-medium flex items-center hover:underline"
                >
                  {lang === "en" ? "View full history" : "Lihat semua riwayat"} <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>

              {/* 3. DETAIL UNDUHAN TERPILIH (Exact Figma Node 2:348) */}
              {selectedTask && (
                <div className="mt-3 p-4 bg-white border border-[#e7e9ef] rounded-[8px] ios-glass-card space-y-3">
                  <div className="flex items-center justify-between border-b border-[#e7e9ef] pb-3">
                    <div>
                      <h3 className="font-semibold text-[12px] text-[#202631]">
                        {selectedTask.filename || selectedTask.url}
                      </h3>
                      <p className="font-normal text-[10px] text-[#6e7685] mt-0.5">
                        {fmtBytes(selectedTask.completedBytes)} {lang === "en" ? "of" : "dari"} {fmtBytes(selectedTask.totalBytes)} ·{" "}
                        {selectedTask.connections || 8} {lang === "en" ? "active connections · Resume supported" : "koneksi aktif · Resume didukung"}
                      </p>
                    </div>
                    <button
                      onClick={() => executeAction("task.openFolder", { id: selectedTask.id })}
                      className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] text-[12px] font-medium flex items-center space-x-2"
                    >
                      <FolderOpen className="w-4 h-4 text-[#6e7685]" />
                      <span>{lang === "en" ? "Open Folder" : "Buka folder"}</span>
                    </button>
                  </div>

                  {/* TRANSFER STATS & PROGRES PER KONEKSI (Exact Figma layout) */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Kecepatan transfer */}
                    <div className="col-span-5 flex flex-col justify-between border-r border-[#e7e9ef] pr-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[9px] font-semibold text-[#6e7685] uppercase tracking-wide">
                            {lang === "en" ? "TRANSFER SPEED" : "KECEPATAN TRANSFER"}
                          </p>
                          <div className="flex items-baseline space-x-1 mt-1">
                            <span className="text-[24px] font-semibold text-[#202631] leading-none">
                              {selectedTask.status === "downloading"
                                ? (selectedTask.speed / (1024 * 1024)).toFixed(1).replace(".", ",")
                                : "0,0"}
                            </span>
                            <span className="text-[11px] text-[#6e7685]">MB/s</span>
                          </div>
                          <p className="text-[10px] text-[#6e7685] mt-1">
                            {lang === "en" ? "Average" : "Rata-rata"} {(selectedTask.speed > 0 ? (selectedTask.speed / (1024 * 1024) * 0.95).toFixed(1) : "0,0").replace(".", ",")} MB/s
                          </p>
                        </div>

                        {/* Figma Speed Graph SVG (Node 2:360) */}
                        <div className="w-[160px] h-[45px] relative">
                          <svg
                            preserveAspectRatio="none"
                            className="w-full h-full"
                            viewBox="0 0 262 50"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <defs>
                              <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6554C0" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#6554C0" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path
                              d="M0.75 49.8L9.75 39.3L18.75 43L27.75 31.8L36.75 37L45.75 33.3L54.75 28.8L63.75 36.3L72.75 23.5L81.75 26.5L90.75 16.8L99.75 25L108.75 20.5L117.75 22.8L126.75 15.3L135.75 19L144.75 13.8L153.75 17.5L162.75 9.3L171.75 14.5L180.75 8.5L189.75 10.8L198.75 4L207.75 10L216.75 5.5L225.75 7L234.75 3.3L243.75 6.3L252.75 1L261.75 4"
                              strokeWidth="2"
                              stroke="#6554C0"
                            />
                            <path
                              d="M0.75 49.8L9.75 39.3L18.75 43L27.75 31.8L36.75 37L45.75 33.3L54.75 28.8L63.75 36.3L72.75 23.5L81.75 26.5L90.75 16.8L99.75 25L108.75 20.5L117.75 22.8L126.75 15.3L135.75 19L144.75 13.8L153.75 17.5L162.75 9.3L171.75 14.5L180.75 8.5L189.75 10.8L198.75 4L207.75 10L216.75 5.5L225.75 7L234.75 3.3L243.75 6.3L252.75 1L261.75 4 L261.75 50 L0.75 50 Z"
                              fill="url(#speedGrad)"
                            />
                          </svg>
                        </div>
                      </div>

                      <div className="flex justify-between text-[9px] text-[#6e7685] mt-1 pt-1">
                        <span>{lang === "en" ? "60s ago" : "60 d lalu"}</span>
                        <span>{lang === "en" ? "Now" : "Sekarang"}</span>
                      </div>
                    </div>

                    {/* Progres per koneksi (Figma 8 segmen paralel) */}
                    <div className="col-span-7">
                      <p className="text-[9px] font-semibold text-[#6e7685] uppercase tracking-wide mb-2">
                        {lang === "en" ? "PROGRESS PER CONNECTION" : "PROGRES PER KONEKSI"}
                      </p>
                      <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                        {Array.from({ length: selectedTask.connections || 8 }).map((_, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <span className="text-[9px] text-[#6e7685] font-mono">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="flex-1 h-[5px] bg-[#eceaf4] rounded-[2px] overflow-hidden">
                              <div
                                className="h-full bg-[#6554c0] rounded-[2px] transition-all duration-300"
                                style={{
                                  width: `${
                                    selectedTask.status === "downloading"
                                      ? Math.min(100, Math.max(15, ((idx + 1) * 14.5) % 100))
                                      : selectedTask.status === "completed"
                                      ? 100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-[#6e7685] mt-2">
                        {lang === "en" ? "Location:" : "Lokasi:"} {selectedTask.dir || "~/Downloads"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. STATUS LAYANAN (Exact Figma Node 2:6, h: 36px, bg: #f7f8fa) */}
            <footer className="h-[36px] ios-glass-bar border-t border-[#e7e9ef] px-4 flex items-center justify-between text-[11px] text-[#202631] flex-shrink-0">
              <div className="flex items-center space-x-4">
                <span className="text-[#218163] font-medium flex items-center gap-1.5">
                  <span className="text-[10px]">●</span>{" "}
                  {lang === "en" ? "Background service active" : "Layanan background aktif"}
                </span>
                <span className="text-[#6e7685]">
                  {lang === "en"
                    ? "Downloads continue when window is closed"
                    : "Unduhan tetap berjalan saat jendela ditutup"}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-[#6e7685]">
                <span className="text-[#202631] font-medium">↓ {fmtBytes(totalSpeed)}/s</span>
                <span>{lang === "en" ? "Available storage: 128 GB" : "Ruang tersedia: 128 GB"}</span>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* DIALOG TAMBAH URL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl border border-[#e7e9ef] rounded-[10px] w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e7e9ef] pb-3">
              <h2 className="text-[14px] font-semibold text-[#202631]">{t.addUrlTitle}</h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-6 h-6 rounded hover:bg-[#f7f8fa] flex items-center justify-center text-[#6e7685]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block text-[#6e7685] mb-1 font-medium">{t.enterUrl}</label>
                <input
                  type="text"
                  placeholder="https://example.com/file.iso or YouTube URL"
                  value={newUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full bg-[#f7f8fa] border border-[#e7e9ef] rounded-[6px] px-3 py-2 text-[#202631] focus:outline-none focus:border-[#6554c0]"
                />
              </div>

              {/* Format selection pills for online video / audio */}
              {isMediaUrl && (
                <div>
                  <label className="block text-[#6e7685] mb-1 font-medium">{lang === "en" ? "Download Format:" : "Format Download:"}</label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadFormat("mp4");
                        if (newFilename.endsWith(".mp3")) {
                          setNewFilename(newFilename.replace(/\.mp3$/, ".mp4"));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-[6px] text-[11px] font-semibold border transition-all ${
                        downloadFormat === "mp4"
                          ? "bg-[#6554c0] text-white border-[#5a4ab0] shadow-sm"
                          : "bg-white text-[#202631] border-[#e7e9ef] hover:bg-[#f7f8fa]"
                      }`}
                    >
                      🎬 Video (MP4)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadFormat("mp3");
                        if (newFilename.endsWith(".mp4")) {
                          setNewFilename(newFilename.replace(/\.mp4$/, ".mp3"));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-[6px] text-[11px] font-semibold border transition-all ${
                        downloadFormat === "mp3"
                          ? "bg-[#6554c0] text-white border-[#5a4ab0] shadow-sm"
                          : "bg-white text-[#202631] border-[#e7e9ef] hover:bg-[#f7f8fa]"
                      }`}
                    >
                      🎵 Audio Only (MP3)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#6e7685] mb-1 font-medium">{t.customFilename}</label>
                <input
                  type="text"
                  placeholder={
                    isMediaUrl
                      ? downloadFormat === "mp3"
                        ? "(Auto detect title · .mp3)"
                        : "(Auto detect title · .mp4)"
                      : "filename.ext (optional)"
                  }
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  className="w-full bg-[#f7f8fa] border border-[#e7e9ef] rounded-[6px] px-3 py-2 text-[#202631] focus:outline-none focus:border-[#6554c0]"
                />
              </div>

              <div>
                <label className="block text-[#6e7685] mb-1 font-medium">{t.connections}</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={newConnections}
                  onChange={(e) => setNewConnections(Number(e.target.value))}
                  className="w-24 bg-[#f7f8fa] border border-[#e7e9ef] rounded-[6px] px-3 py-1.5 text-[#202631] focus:outline-none focus:border-[#6554c0]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-1.5 rounded-[6px] bg-[#f7f8fa] hover:bg-[#e7e9ef] text-[#202631] text-[12px] font-medium"
              >
                {t.cancelAction}
              </button>
              <button
                onClick={handleAddDownload}
                className="px-4 py-1.5 rounded-[6px] ios-button-primary text-white text-[12px] font-medium"
              >
                {t.startDownloadBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG KELUAR TRAY */}
      {isExitDialogOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl border border-[#e7e9ef] rounded-[10px] w-full max-w-sm p-5 shadow-2xl space-y-3">
            <h2 className="text-[14px] font-semibold text-[#202631]">{t.exitDialogTitle}</h2>
            <p className="text-[12px] text-[#6e7685] leading-relaxed">{t.exitDialogMsg}</p>
            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-2 px-3 rounded-[6px] ios-button-primary text-white text-[12px] font-medium"
              >
                {t.exitKeepDownloading}
              </button>
              <button
                onClick={() => {
                  executeAction("task.pauseAll");
                  setIsExitDialogOpen(false);
                }}
                className="w-full py-2 px-3 rounded-[6px] bg-[#f7f8fa] border border-[#e7e9ef] hover:bg-[#e7e9ef] text-[#202631] text-[12px] font-medium"
              >
                {t.exitPauseAll}
              </button>
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-1.5 px-3 rounded-[6px] text-[#6e7685] hover:text-[#202631] text-[12px]"
              >
                {t.cancelAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
