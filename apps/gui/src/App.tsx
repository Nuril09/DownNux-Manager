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
  Activity,
  Minimize2,
  Square,
  X,
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
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`;
}

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "--:--";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
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

export function App() {
  const [lang, setLang] = useState<Lang>("en");
  const t = translations[lang];

  const [osName, setOsName] = useState<string>("Detecting OS...");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setDaemonConnected] = useState(false);

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [, setIsSettingsOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  // Form states
  const [newUrl, setNewUrl] = useState("");
  const [newFilename, setNewFilename] = useState("");
  const [newConnections, setNewConnections] = useState(8);

  // Fetch dynamic OS info from daemon
  useEffect(() => {
    fetch("http://127.0.0.1:44990/api/sysinfo")
      .then((r) => r.json())
      .then((data) => {
        if (data?.os) setOsName(`${data.os} · Desktop`);
      })
      .catch(() => {
        // Fallback detection from navigator
        const ua = navigator.userAgent;
        if (ua.includes("Linux")) setOsName("Ubuntu · Desktop");
        else if (ua.includes("Windows")) setOsName("Windows · Desktop");
        else if (ua.includes("Mac")) setOsName("macOS · Desktop");
        else setOsName("Desktop System");
      });
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
          setDaemonConnected(true);
          if (!selectedId && json.result.length > 0) {
            setSelectedId(json.result[0].id);
          }
        }
      } catch {
        setDaemonConnected(false);
      }
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
      start: true,
    });
    setIsAddOpen(false);
    setNewUrl("");
    setNewFilename("");
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      task.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.url.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory) {
      return getCategory(task.filename) === activeCategory;
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-200 select-none bg-gradient-to-br from-slate-950 via-[#0e111a] to-[#151928]">
      {/* 1. TITLEBAR (iOS Glass & dynamic OS display from user's Figma design) */}
      <header className="flex items-center justify-between px-4 py-2.5 ios-glass border-b border-white/5 relative z-30">
        <div className="flex items-center space-x-3">
          {/* User's custom uploaded icon */}
          <img
            src="/app-icon.png"
            alt="DownNux"
            className="w-7 h-7 rounded-lg shadow-lg shadow-orange-500/20 object-contain ring-1 ring-white/10"
          />
          <div className="flex items-baseline space-x-2">
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              DownNux Manager
            </span>
            <span className="text-[10px] text-white/40 font-mono">v0.1</span>
          </div>
        </div>

        {/* Dynamic OS indicator matching Figma node "Ubuntu · Desktop" */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-2 px-3 py-1 rounded-full ios-glass-subtle text-xs text-white/70 font-medium">
          <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>{osName}</span>
        </div>

        {/* Right header controls: i18n switcher & window buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-full ios-glass-button text-white/80 hover:text-white"
            title="Switch Language"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">{lang === "en" ? "EN" : "ID"}</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Window control buttons */}
          <div className="flex items-center space-x-1.5 text-white/40">
            <button className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors">
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors">
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsExitDialogOpen(true)}
              className="w-7 h-7 rounded-md hover:bg-rose-500/80 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT: SIDEBAR + WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR NAVIGATION (Matching Figma's "Navigasi") */}
        <aside className="w-56 ios-glass border-r border-white/5 flex flex-col justify-between p-3.5 z-20">
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Library / Pustaka */}
            <div>
              <div className="text-[10px] font-bold text-white/40 tracking-wider uppercase px-2 mb-2">
                {lang === "en" ? "LIBRARY" : "PUSTAKA"}
              </div>
              <div className="space-y-1">
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
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                        active
                          ? "bg-indigo-600/30 text-white font-medium shadow-sm border border-indigo-500/30 backdrop-blur-md"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${active ? "text-indigo-400" : "text-white/40"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                            active ? "bg-indigo-500/40 text-white" : "bg-white/5 text-white/40"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categories / Kategori */}
            <div>
              <div className="text-[10px] font-bold text-white/40 tracking-wider uppercase px-2 mb-2">
                {lang === "en" ? "CATEGORIES" : "KATEGORI"}
              </div>
              <div className="space-y-1">
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
                      className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                        active
                          ? "bg-indigo-600/30 text-white font-medium border border-indigo-500/30 backdrop-blur-md"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-indigo-400" : "text-white/40"}`} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tools / Penjadwal & Pengaturan */}
            <div className="pt-2 border-t border-white/5 space-y-1">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-white/40" />
                <span>{t.settings}</span>
              </button>
            </div>
          </div>

          {/* Browser Connection Card (Matching Figma "Koneksi browser") */}
          <div className="p-3 rounded-2xl ios-glass-card mt-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Browser Connected</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1 leading-tight">
              Ready to capture links from Chrome, Brave, Edge & Firefox.
            </p>
          </div>
        </aside>

        {/* WORKSPACE AREA (Matching Figma's "Area kerja") */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/20 backdrop-blur-md">
          {/* Top Bar: Title, Search, and Action Toolbar */}
          <div className="p-5 pb-3 border-b border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{t.allDownloads}</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {lang === "en"
                    ? "Manage your downloads. Fast, segmented, and uninterrupted."
                    : "Kelola unduhanmu. Cepat, teratur, tanpa terputus."}
                </p>
              </div>

              {/* Search Bar (Matching Figma with Ctrl K pill) */}
              <div className="relative w-80">
                <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={lang === "en" ? "Search file name or URL..." : "Cari nama file atau URL..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-14 py-1.5 rounded-xl ios-glass-subtle text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/40">
                  Ctrl K
                </span>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl ios-glass-primary text-white text-xs font-semibold shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addUrl}</span>
              </button>

              <button
                disabled={!selectedTask || selectedTask.status !== "paused"}
                onClick={() => selectedTask && executeAction("task.resume", { id: selectedTask.id })}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ios-glass-button text-xs font-medium text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.resume}</span>
              </button>

              <button
                disabled={!selectedTask || selectedTask.status !== "downloading"}
                onClick={() => selectedTask && executeAction("task.pause", { id: selectedTask.id })}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ios-glass-button text-xs font-medium text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.pause}</span>
              </button>

              <button
                disabled={!selectedTask || selectedTask.status === "completed"}
                onClick={() => selectedTask && executeAction("task.cancel", { id: selectedTask.id })}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ios-glass-button text-xs font-medium text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.cancel}</span>
              </button>

              <button
                disabled={!selectedTask}
                onClick={() => selectedTask && executeAction("task.remove", { id: selectedTask.id, deleteFile: false })}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ios-glass-button text-xs font-medium text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.delete}</span>
              </button>

              <div className="h-4 w-[1px] bg-white/10 mx-1" />

              <button
                onClick={() => executeAction("task.pauseAll")}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ios-glass-button text-xs font-medium text-white/70 hover:text-white"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>{t.pauseAll}</span>
              </button>
            </div>
          </div>

          {/* Download Table */}
          <div className="flex-1 overflow-auto p-4">
            <div className="rounded-2xl ios-glass-card overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-semibold text-white/40 uppercase tracking-wider bg-white/[0.02]">
                    <th className="py-3 px-4 w-72">{t.filename}</th>
                    <th className="py-3 px-4 w-28">{t.size}</th>
                    <th className="py-3 px-4 w-32">{t.status}</th>
                    <th className="py-3 px-4 w-44">{t.progress}</th>
                    <th className="py-3 px-4 w-28">{t.speed}</th>
                    <th className="py-3 px-4 w-24">{t.eta}</th>
                    <th className="py-3 px-4 w-32">{t.added}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-white/40">
                        <Folder className="w-9 h-9 mx-auto mb-2 opacity-30 text-indigo-400" />
                        <p className="text-sm font-medium text-white/60">No active downloads</p>
                        <p className="text-xs text-white/30 mt-0.5">
                          Click "+ Add URL" or download via browser extension
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const isSelected = selectedTask?.id === task.id;
                      const pct = task.totalBytes > 0 ? (task.completedBytes / task.totalBytes) * 100 : 0;
                      const remainingBytes = task.totalBytes - task.completedBytes;
                      const etaSec = task.speed > 0 ? remainingBytes / task.speed : 0;

                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedId(task.id)}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-500/15 text-white"
                              : "hover:bg-white/[0.03] text-white/70 hover:text-white"
                          }`}
                        >
                          <td className="py-3 px-4 font-medium flex items-center space-x-2.5 max-w-xs truncate">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 shadow-sm shadow-indigo-400" />
                            <span className="truncate">{task.filename || task.url}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                            {fmtBytes(task.completedBytes)} / {fmtBytes(task.totalBytes)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                                task.status === "completed"
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                                  : task.status === "downloading"
                                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse"
                                  : task.status === "paused"
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                                  : task.status === "failed"
                                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                                  : "bg-white/10 text-white/60"
                              }`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="w-36 bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-white/40 mt-1 inline-block">
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-indigo-300 font-semibold whitespace-nowrap">
                            {task.status === "downloading" ? `${fmtBytes(task.speed)}/s` : "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-white/50 whitespace-nowrap">
                            {task.status === "downloading" ? fmtTime(etaSec) : "—"}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-white/40 whitespace-nowrap">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Detail Inspector Card (Matching bottom section in user's Figma prototype) */}
            {selectedTask && (
              <div className="mt-4 p-4 rounded-2xl ios-glass-card space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{selectedTask.filename || selectedTask.url}</span>
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5 font-mono">
                      {fmtBytes(selectedTask.completedBytes)} of {fmtBytes(selectedTask.totalBytes)} •{" "}
                      {selectedTask.connections} connections
                    </p>
                  </div>
                  <button
                    onClick={() => executeAction("task.openFolder", { id: selectedTask.id })}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ios-glass-button text-xs font-medium text-white/80 hover:text-white"
                  >
                    <Folder className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Open Folder</span>
                  </button>
                </div>

                {/* Progress bar per connection segments (IDM Signature Feature) */}
                <div>
                  <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                    <span className="font-semibold text-white/80">Segmented Connection Progress (Parallel Range)</span>
                    <span className="font-mono text-indigo-300">{fmtBytes(selectedTask.speed)}/s</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: selectedTask.connections || 8 }).map((_, idx) => (
                      <div key={idx} className="p-2 rounded-xl ios-glass-subtle">
                        <div className="flex justify-between text-[10px] text-white/40 font-mono mb-1">
                          <span>Conn #{idx + 1}</span>
                          <span>Active</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(10, ((idx + 1) * 12.5) % 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Status Bar (Matching Figma bottom bar) */}
          <footer className="h-8 ios-glass border-t border-white/5 px-4 flex items-center justify-between text-[11px] text-white/50">
            <div className="flex items-center space-x-4">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Background Service Active
              </span>
              <span>•</span>
              <span>Downloads continue even if window is closed</span>
            </div>
            <div className="flex items-center space-x-4 font-mono">
              <span className="text-indigo-300">↓ {fmtBytes(totalSpeed)}/s</span>
              <span>•</span>
              <span>Available disk: ~128 GB</span>
            </div>
          </footer>
        </main>
      </div>

      {/* 3. ADD DOWNLOAD DIALOG (iOS Glass Modal) */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="ios-glass border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-400" />
                {t.addUrlTitle}
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-white/70 mb-1.5 font-medium">{t.enterUrl}</label>
                <input
                  type="text"
                  placeholder="https://example.com/file.iso"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full ios-glass-subtle rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1.5 font-medium">{t.customFilename}</label>
                <input
                  type="text"
                  placeholder="optional-file-name.iso"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  className="w-full ios-glass-subtle rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1.5 font-medium">{t.connections}</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={newConnections}
                  onChange={(e) => setNewConnections(Number(e.target.value))}
                  className="w-28 ios-glass-subtle rounded-xl px-3.5 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl ios-glass-button text-white/60 hover:text-white text-xs font-medium"
              >
                {t.close}
              </button>
              <button
                onClick={handleAddDownload}
                className="px-5 py-2 rounded-xl ios-glass-primary text-white text-xs font-semibold shadow-lg"
              >
                {t.startDownloadBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. EXIT DIALOG (System Tray Close Action) */}
      {isExitDialogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="ios-glass border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white">{t.exitDialogTitle}</h2>
            <p className="text-xs text-white/60 leading-relaxed">{t.exitDialogMsg}</p>
            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl ios-glass-primary text-white text-xs font-semibold shadow-md"
              >
                {t.exitKeepDownloading}
              </button>
              <button
                onClick={() => {
                  executeAction("task.pauseAll");
                  setIsExitDialogOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl ios-glass-button text-white/80 hover:text-white text-xs font-medium"
              >
                {t.exitPauseAll}
              </button>
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-2 px-4 rounded-xl text-white/40 hover:text-white text-xs font-medium"
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
