import { useState } from "react";
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
  PlayCircle,
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
  if (["deb", "rpm", "appimage", "sh", "exe", "iso", "bin"].includes(ext)) return "programs";
  return "other";
}

export function App() {
  const [lang, setLang] = useState<Lang>("en");
  const t = translations[lang];

  const [tasks] = useState<Task[]>([
    {
      id: "demo-1",
      url: "https://releases.ubuntu.com/noble/ubuntu-24.04.1-desktop-amd64.iso",
      dir: "/home/user/Downloads",
      filename: "ubuntu-24.04.1-desktop-amd64.iso",
      status: "downloading",
      totalBytes: 6116802560,
      completedBytes: 3824000000,
      speed: 14200000,
      connections: 8,
      activeConnections: 8,
      createdAt: Date.now() - 120000,
      updatedAt: Date.now(),
    },
    {
      id: "demo-2",
      url: "https://example.com/videos/nature-4k.mp4",
      dir: "/home/user/Downloads",
      filename: "nature-4k.mp4",
      status: "completed",
      totalBytes: 524288000,
      completedBytes: 524288000,
      speed: 0,
      connections: 8,
      activeConnections: 0,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3500000,
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  // Form states
  const [newUrl, setNewUrl] = useState("");
  const [newFilename, setNewFilename] = useState("");
  const [newConnections, setNewConnections] = useState(8);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
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

  const selectedTask = tasks.find((t) => t.id === selectedId);

  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "id" : "en"));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* 1. TOP HEADER / TITLEBAR */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-500/20">
            D
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
              {t.appTitle}
              <span className="text-[10px] text-slate-400 font-normal px-1.5 py-0.5 rounded bg-slate-800">
                v0.0.1 MVP
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Switch Language (English / Indonesia)"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "EN" : "ID"}</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-700 mx-1" />
          <span className="text-xs text-slate-500">By {t.developer}</span>
        </div>
      </header>

      {/* 2. TOOLBAR (IDM Pattern) */}
      <div className="flex items-center space-x-1 px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur">
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addUrl}</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-800 mx-1" />

        <button
          disabled={!selectedTask || selectedTask.status !== "paused"}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 text-xs font-medium transition-colors"
        >
          <Play className="w-3.5 h-3.5 text-green-400" />
          <span>{t.resume}</span>
        </button>

        <button
          disabled={!selectedTask || selectedTask.status !== "downloading"}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 text-xs font-medium transition-colors"
        >
          <Pause className="w-3.5 h-3.5 text-yellow-400" />
          <span>{t.pause}</span>
        </button>

        <button
          disabled={!selectedTask || selectedTask.status === "completed"}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 text-xs font-medium transition-colors"
        >
          <XCircle className="w-3.5 h-3.5 text-orange-400" />
          <span>{t.cancel}</span>
        </button>

        <button
          disabled={!selectedTask}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 text-xs font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span>{t.delete}</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-800 mx-1" />

        <button
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <PauseCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.pauseAll}</span>
        </button>

        <button
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <PlayCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.resumeAll}</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.settings}</span>
        </button>
      </div>

      {/* 3. MAIN WORKSPACE: SIDEBAR + TABLE */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-56 bg-slate-900/40 border-r border-slate-800 flex flex-col p-2 space-y-4">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">
              Status
            </div>
            <div className="space-y-0.5">
              {[
                { id: "all", label: t.allDownloads, icon: Layers, count: tasks.length },
                { id: "downloading", label: t.downloading, icon: Download, count: tasks.filter(t => t.status === "downloading").length },
                { id: "completed", label: t.completed, icon: CheckCircle2, count: tasks.filter(t => t.status === "completed").length },
                { id: "queued", label: t.queued, icon: Clock, count: tasks.filter(t => t.status === "queued").length },
                { id: "failed", label: t.failed, icon: AlertCircle, count: tasks.filter(t => t.status === "failed").length },
              ].map((item) => {
                const Icon = item.icon;
                const active = !activeCategory && activeFilter === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveFilter(item.id); setActiveCategory(null); }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                      active ? "bg-blue-600/15 text-blue-400 font-medium" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? "bg-blue-600/30 text-blue-300" : "bg-slate-800 text-slate-500"}`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">
              {t.categories}
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
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                      active ? "bg-blue-600/15 text-blue-400 font-medium" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* DOWNLOAD TABLE */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-3 w-72">{t.filename}</th>
                  <th className="py-2.5 px-3 w-28">{t.size}</th>
                  <th className="py-2.5 px-3 w-28">{t.status}</th>
                  <th className="py-2.5 px-3 w-44">{t.progress}</th>
                  <th className="py-2.5 px-3 w-28">{t.speed}</th>
                  <th className="py-2.5 px-3 w-24">{t.eta}</th>
                  <th className="py-2.5 px-3 w-36">{t.added}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500 font-sans">
                      <Folder className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No downloads matching this filter.</p>
                      <button
                        onClick={() => setIsAddOpen(true)}
                        className="mt-3 text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Click here to add a download
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const isSelected = selectedId === task.id;
                    const pct = task.totalBytes > 0 ? (task.completedBytes / task.totalBytes) * 100 : 0;
                    const remainingBytes = task.totalBytes - task.completedBytes;
                    const etaSec = task.speed > 0 ? remainingBytes / task.speed : 0;

                    return (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedId(task.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-600/20 text-slate-100" : "hover:bg-slate-900/50 text-slate-300"
                        }`}
                      >
                        <td className="py-2.5 px-3 truncate max-w-xs font-sans font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="truncate">{task.filename || task.url}</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {fmtBytes(task.completedBytes)} / {fmtBytes(task.totalBytes)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              task.status === "completed"
                                ? "bg-green-500/10 text-green-400"
                                : task.status === "downloading"
                                ? "bg-blue-500/10 text-blue-400 animate-pulse"
                                : task.status === "paused"
                                ? "bg-yellow-500/10 text-yellow-400"
                                : task.status === "failed"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400">{pct.toFixed(1)}%</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-blue-400 font-semibold">
                          {task.status === "downloading" ? `${fmtBytes(task.speed)}/s` : "-"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                          {task.status === "downloading" ? fmtTime(etaSec) : "-"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[11px] font-sans">
                          {new Date(task.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* STATUS FOOTER */}
          <footer className="h-7 bg-slate-900 border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center space-x-4">
              <span>{filteredTasks.length} items</span>
              <span>•</span>
              <span className="text-green-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Daemon connected
              </span>
            </div>
            <div>
              <span>DownNux Manager • CreativeMichiz</span>
            </div>
          </footer>
        </main>
      </div>

      {/* 4. ADD DOWNLOAD DIALOG */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-lg p-5 shadow-2xl">
            <h2 className="text-sm font-semibold mb-4 text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              {t.addUrlTitle}
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">{t.enterUrl}</label>
                <input
                  type="text"
                  placeholder="https://example.com/file.iso"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">{t.customFilename}</label>
                <input
                  type="text"
                  placeholder="custom-name.iso"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">{t.connections}</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={newConnections}
                  onChange={(e) => setNewConnections(Number(e.target.value))}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                {t.close}
              </button>
              <button
                onClick={() => {
                  if (!newUrl) return;
                  alert("Download added to queue!");
                  setIsAddOpen(false);
                  setNewUrl("");
                  setNewFilename("");
                }}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                {t.startDownloadBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SETTINGS DIALOG */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md p-5 shadow-2xl">
            <h2 className="text-sm font-semibold mb-4 text-slate-100 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-blue-400" />
              {t.settingsTitle}
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium">{t.language}</label>
                <div className="flex space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="lang"
                      checked={lang === "en"}
                      onChange={() => setLang("en")}
                      className="text-blue-600"
                    />
                    <span>English (Default)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="lang"
                      checked={lang === "id"}
                      onChange={() => setLang("id")}
                      className="text-blue-600"
                    />
                    <span>Bahasa Indonesia</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">{t.defaultConnections}</label>
                <input
                  type="number"
                  defaultValue={8}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">{t.maxConcurrent}</label>
                <input
                  type="number"
                  defaultValue={3}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EXIT CONFIRMATION DIALOG (Tray Close Requirement) */}
      {isExitDialogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-sm p-5 shadow-2xl">
            <h2 className="text-sm font-semibold mb-2 text-slate-100">{t.exitDialogTitle}</h2>
            <p className="text-xs text-slate-400 mb-4">{t.exitDialogMsg}</p>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-2 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                {t.exitKeepDownloading}
              </button>
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                {t.exitPauseAll}
              </button>
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-2 px-3 rounded hover:bg-slate-800/50 text-slate-400 text-xs font-medium"
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
