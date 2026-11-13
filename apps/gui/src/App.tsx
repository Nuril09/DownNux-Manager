import { useState, useEffect, useRef, useMemo } from "react";
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
  Minus,
  Square,
  X,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  Loader2,
  ArrowDown,
  Check,
  Magnet,
  Maximize2,
  Radio,
  ArrowUp,
  MoreVertical,
  RotateCcw,
} from "lucide-react";
import { translations, type Lang } from "./i18n";
import { SettingsView, type SettingsData } from "./components/SettingsView";
import { SchedulerView, type ScheduleConfigData } from "./components/SchedulerView";
import { DownloadDetailModal } from "./components/DownloadDetailModal";
import { UpdateModal, type UpdateInfo } from "./components/UpdateModal";

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

  isTorrent?: boolean;
  uploadSpeed?: number;
  uploadBytes?: number;
  numSeeders?: number;
  pieceLength?: number;
  numPieces?: number;
  bitfield?: string;
  speedHistory?: number[];
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

function getCategory(
  filename: string,
  url?: string,
  isTorrent?: boolean,
): "video" | "music" | "documents" | "compressed" | "programs" | "torrents" | "other" {
  if (isTorrent || (url && url.startsWith("magnet:?")) || filename.endsWith(".torrent")) return "torrents";
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["mp4", "mkv", "webm", "avi", "mov", "flv"].includes(ext)) return "video";
  if (["mp3", "flac", "wav", "m4a", "aac", "ogg", "opus"].includes(ext)) return "music";
  if (["pdf", "docx", "doc", "xlsx", "pptx", "txt", "epub"].includes(ext)) return "documents";
  if (["zip", "tar", "gz", "7z", "rar", "bz2", "xz"].includes(ext)) return "compressed";
  if (["deb", "rpm", "appimage", "sh", "exe", "iso", "bin", "dmg"].includes(ext)) return "programs";
  return "other";
}

function getFileIcon(filename: string, url?: string, isTorrent?: boolean) {
  const cat = getCategory(filename, url, isTorrent);
  switch (cat) {
    case "torrents":
      return Magnet;
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
  const [activeView, setActiveView] = useState<"downloads" | "scheduler" | "settings">("downloads");

  // Settings & Scheduler persistent data
  const [settingsData, setSettingsData] = useState<SettingsData>({
    theme: "system",
    accentColor: "#6554c0",
    blurLevel: "high",
    language: "en",
    downloadDir: "",
    categoryDirs: { video: "", music: "", documents: "", compressed: "", programs: "", other: "" },
    rememberLastDir: true,
    speedLimiterEnabled: false,
    speedLimitBytesPerSec: 0,
    defaultConnections: 8,
    maxConcurrent: 3,
    autoResumeOnStart: true,
    retryCount: 5,
    showPreDownloadDialog: true,
    notifyOnStart: true,
    notifyOnComplete: true,
    soundOnComplete: false,
    onCompleteAction: "none",
  });

  const [schedulerConfig, setSchedulerConfig] = useState<ScheduleConfigData>({
    enabled: false,
    mode: "recurring",
    startTime: "01:00",
    stopTime: "06:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    maxSimultaneous: 1,
    onFinishAction: "none",
  });

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [inspectingTaskId, setInspectingTaskId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckUpdates = async (openModal = false) => {
    if (openModal) setIsUpdateModalOpen(true);
    setIsCheckingUpdate(true);
    try {
      const res = await fetch("http://127.0.0.1:44990/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "app.checkUpdate", params: {} }),
      });
      const json = await res.json();
      if (json.result) {
        setUpdateInfo(json.result);
      }
    } catch (err) {
      console.error("Update check error:", err);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    handleCheckUpdates(false);
  }, []);

  // Close action menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest(".action-menu-container")) {
        setOpenActionMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Form & IDM Pre-download states
  const [newUrl, setNewUrl] = useState("");
  const [newFilename, setNewFilename] = useState("");
  const [saveDir, setSaveDir] = useState<string>("");
  const [newConnections, setNewConnections] = useState(8);
  const [downloadFormat, setDownloadFormat] = useState<"mp4" | "mp3">("mp4");
  const [torrentBase64, setTorrentBase64] = useState<string>("");
  const torrentFileInputRef = useRef<HTMLInputElement>(null);

  const handleTorrentFileSelected = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setTorrentBase64(base64 || "");
      setNewUrl(file.name);
      setNewFilename(file.name.replace(/\.torrent$/i, ""));
      setProbeResult({
        url: file.name,
        filename: file.name.replace(/\.torrent$/i, ""),
        size: file.size,
        formattedSize: `${(file.size / 1024).toFixed(1)} KB (Torrent)`,
        resumeSupported: true,
        category: "torrents",
        contentType: "application/x-bittorrent",
        isMedia: false,
        defaultDir: settingsData.downloadDir || "~/Downloads",
      });
    };
    reader.readAsDataURL(file);
  };

  const inspectingTask = tasks.find((t) => t.id === inspectingTaskId) || null;
  const [probeResult, setProbeResult] = useState<{
    url: string;
    filename: string;
    size: number;
    formattedSize: string;
    resumeSupported: boolean;
    category: string;
    contentType?: string;
    isMedia: boolean;
    defaultDir: string;
  } | null>(null);
  const [isProbing, setIsProbing] = useState(false);

  // Apply Theme Mode (System, Light, Dark) & Blur Mode
  useEffect(() => {
    const applyTheme = () => {
      const mode = settingsData.theme;
      const isDark =
        mode === "dark" ||
        (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      if (settingsData.blurLevel === "low") {
        document.documentElement.classList.add("low-blur");
      } else {
        document.documentElement.classList.remove("low-blur");
      }
    };

    applyTheme();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", applyTheme);
    return () => mql.removeEventListener("change", applyTheme);
  }, [settingsData.theme, settingsData.blurLevel]);

  // Load Settings and Scheduler configs on mount
  useEffect(() => {
    fetch("http://127.0.0.1:44990/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "settings.get", params: {} }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.result) {
          setSettingsData(json.result);
          if (json.result.language) setLang(json.result.language);
          if (json.result.defaultConnections) setNewConnections(json.result.defaultConnections);
        }
      })
      .catch(() => { });

    fetch("http://127.0.0.1:44990/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "scheduler.get", params: {} }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.result) {
          setSchedulerConfig(json.result);
        }
      })
      .catch(() => { });
  }, []);

  // WebKit Native Window Folder Chooser Callback
  useEffect(() => {
    (window as any).__downnux_onFolderSelected = (path: string) => {
      const field = (window as any).__downnux_pendingField || "download";
      if (field === "download") {
        setSaveDir(path);
      } else if (field === "default") {
        setSettingsData((prev) => ({ ...prev, downloadDir: path }));
      } else if (["video", "music", "documents", "compressed", "programs"].includes(field)) {
        setSettingsData((prev) => ({
          ...prev,
          categoryDirs: { ...prev.categoryDirs, [field]: path },
        }));
      }
    };
  }, []);

  const handleBrowseFolderForTarget = async (targetField: string = "download", currentPath?: string): Promise<string | null> => {
    (window as any).__downnux_pendingField = targetField;
    try {
      (window as any).webkit?.messageHandlers?.windowControl?.postMessage("selectFolder");
    } catch { }

    try {
      const res = await fetch("http://127.0.0.1:44990/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "dialog.selectFolder", params: { defaultPath: currentPath } }),
      });
      const json = await res.json();
      if (json.result?.ok && json.result?.path) {
        const path = json.result.path;
        if (targetField === "download") {
          setSaveDir(path);
        } else if (targetField === "default") {
          setSettingsData((prev) => ({ ...prev, downloadDir: path }));
        } else if (["video", "music", "documents", "compressed", "programs"].includes(targetField)) {
          setSettingsData((prev) => ({
            ...prev,
            categoryDirs: { ...prev.categoryDirs, [targetField]: path },
          }));
        }
        return path;
      }
    } catch (err) {
      console.warn("Folder picker error:", err);
    }
    return null;
  };

  const handleSaveSettings = async (next: SettingsData) => {
    try {
      await fetch("http://127.0.0.1:44990/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "settings.update", params: next }),
      });
      setSettingsData(next);
      if (next.language) setLang(next.language);
      if (next.defaultConnections) setNewConnections(next.defaultConnections);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const handlePreviewSettings = (preview: Partial<SettingsData>) => {
    setSettingsData((prev) => ({ ...prev, ...preview }));
    if (preview.language) {
      setLang(preview.language);
    }
  };

  const handleSaveScheduler = async (next: ScheduleConfigData) => {
    try {
      await fetch("http://127.0.0.1:44990/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "scheduler.update", params: next }),
      });
      setSchedulerConfig(next);
    } catch (err) {
      console.error("Failed to save scheduler:", err);
    }
  };

  const handleRunSchedulerNow = async () => {
    try {
      await fetch("http://127.0.0.1:44990/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "scheduler.runNow", params: {} }),
      });
    } catch (err) {
      console.error("Failed to run scheduler:", err);
    }
  };

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
    } catch { }
  };

  // Live URL inspection & metadata probing (IDM Style)
  useEffect(() => {
    const trimmed = newUrl.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      setProbeResult(null);
      setIsProbing(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsProbing(true);
      try {
        const res = await fetch("http://127.0.0.1:44990/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "task.probe",
            params: { url: trimmed },
          }),
        });
        const json = await res.json();
        if (json.result) {
          setProbeResult(json.result);
          if (!newFilename || newFilename === "video.mp4" || newFilename === "audio.mp3" || !newFilename.includes(".")) {
            setNewFilename(json.result.filename);
          }
          if (!saveDir) {
            setSaveDir(json.result.defaultDir);
          }
        }
      } catch (err) {
        console.warn("Probe error:", err);
      } finally {
        setIsProbing(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [newUrl]);

  // Handle native folder chooser
  const handleSelectFolder = async () => {
    await handleBrowseFolderForTarget("download", saveDir);
  };

  // Fetch dynamic OS info from daemon
  useEffect(() => {
    fetch("http://127.0.0.1:44990/api/sysinfo")
      .then((r) => r.json())
      .then((data) => {
        if (data?.os) setOsName(`${data.os} · Desktop`);
      })
      .catch(() => { });
  }, []);

  // Poll daemon RPC tasks & auto-focus active downloading task
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
          // Auto focus active downloading task so transfer stats card is never stuck on completed
          const activeTask = json.result.find((t: Task) => t.status === "downloading" || t.status === "retrying");
          if (activeTask) {
            const currentSelected = json.result.find((t: Task) => t.id === selectedId);
            if (!currentSelected || currentSelected.status === "completed" || currentSelected.status === "failed") {
              setSelectedId(activeTask.id);
            }
          } else if (!selectedId && json.result.length > 0) {
            setSelectedId(json.result[0].id);
          }
        }
      } catch { }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 1200);
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

  const handleOpenFile = (task: Task) => {
    executeAction("task.openFile", { id: task.id });
    const targetFile = task.dir ? `${task.dir}/${task.filename}` : task.filename;
    postWindowMessage(`openFile:${targetFile}`);
  };

  const handleOpenFolder = (task: Task) => {
    executeAction("task.openFolder", { id: task.id });
    postWindowMessage(`openFolder:${task.dir || ""}`);
  };

  const handleRepair = async (task: Task) => {
    await executeAction("task.repair", { id: task.id });
    setInspectingTaskId(task.id);
  };

  const handleDeleteWithFile = async (task: Task) => {
    if (window.confirm(t.deleteConfirmDesc)) {
      await executeAction("task.remove", { id: task.id, deleteFile: true });
    }
  };

  const handleAddDownload = async (startImmediately: boolean = true) => {
    if (!newUrl) return;
    const finalFilename = newFilename ? newFilename.trim() : (probeResult?.filename || undefined);
    const finalDir = saveDir ? saveDir.trim() : (probeResult?.defaultDir || undefined);

    try {
      const res = await fetch("http://127.0.0.1:44990/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "task.add",
          params: {
            url: newUrl.trim(),
            filename: finalFilename,
            dir: finalDir,
            connections: newConnections,
            headers: {
              format: downloadFormat === "mp3" ? "audio" : "video",
            },
            torrentBase64: torrentBase64 || undefined,
            start: startImmediately,
          },
        }),
      });
      const json = await res.json();
      if (json.result?.id) {
        setSelectedId(json.result.id);
        if (startImmediately) {
          setInspectingTaskId(json.result.id); // Auto popup IDM progress window!
        }
      }
    } catch (err) {
      console.error(err);
    }

    setIsAddOpen(false);
    setNewUrl("");
    setNewFilename("");
    setSaveDir("");
    setProbeResult(null);
    setTorrentBase64("");
    setDownloadFormat("mp4");
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      (task.filename || task.url).toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory) {
      return getCategory(task.filename || task.url, task.url, task.isTorrent) === activeCategory;
    }
    if (activeFilter === "downloading") return task.status === "downloading" || task.status === "retrying";
    if (activeFilter === "completed") return task.status === "completed";
    if (activeFilter === "queued") return task.status === "queued";
    if (activeFilter === "paused") return task.status === "paused";
    if (activeFilter === "failed") return task.status === "failed";
    return true;
  });

  const selectedTask = tasks.find((t) => t.id === selectedId) || tasks[0];

  const speedSvgPaths = useMemo(() => {
    if (!selectedTask?.speedHistory || selectedTask.speedHistory.length < 2) {
      return {
        line: "M0.75 49.8L9.75 39.3L18.75 43L27.75 31.8L36.75 37L45.75 33.3L54.75 28.8L63.75 36.3L72.75 23.5L81.75 26.5L90.75 16.8L99.75 25L108.75 20.5L117.75 22.8L126.75 15.3L135.75 19L144.75 13.8L153.75 17.5L162.75 9.3L171.75 14.5L180.75 8.5L189.75 10.8L198.75 4L207.75 10L216.75 5.5L225.75 7L234.75 3.3L243.75 6.3L252.75 1L261.75 4",
        area: "M0.75 49.8L9.75 39.3L18.75 43L27.75 31.8L36.75 37L45.75 33.3L54.75 28.8L63.75 36.3L72.75 23.5L81.75 26.5L90.75 16.8L99.75 25L108.75 20.5L117.75 22.8L126.75 15.3L135.75 19L144.75 13.8L153.75 17.5L162.75 9.3L171.75 14.5L180.75 8.5L189.75 10.8L198.75 4L207.75 10L216.75 5.5L225.75 7L234.75 3.3L243.75 6.3L252.75 1L261.75 4 L261.75 50 L0.75 50 Z",
      };
    }
    const history = selectedTask.speedHistory;
    const max = Math.max(...history, 1024 * 1024);
    const width = 262;
    const height = 50;
    const step = width / (history.length - 1);
    const points = history.map((val, idx) => {
      const x = idx * step;
      const y = height - Math.max(2, (val / max) * (height - 4));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = "M" + points.join(" L");
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [selectedTask?.speedHistory]);
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

  // Native Window Control Handlers (CSD / Frameless window bridge)
  const postWindowMessage = (action: string) => {
    try {
      (window as any).webkit?.messageHandlers?.windowControl?.postMessage(action);
    } catch (err) {
      console.warn("windowControl message failed:", err);
    }
  };

  const handleMinimize = () => {
    postWindowMessage("minimize");
  };

  const handleMaximize = () => {
    postWindowMessage("maximize");
  };

  const handleClose = () => {
    const hasActive = tasks.some((t) => t.status === "downloading" || t.status === "retrying");
    if (hasActive) {
      setIsExitDialogOpen(true);
    } else {
      postWindowMessage("close");
    }
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest("button, input, a, select, textarea")) {
      postWindowMessage("drag");
    }
  };

  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest("button, input, a, select, textarea")) {
      postWindowMessage("maximize");
    }
  };

  const handleResize = (e: React.MouseEvent, edge: string) => {
    e.preventDefault();
    postWindowMessage(`resize:${edge}`);
  };

  return (
    <div className="ios-glass-canvas h-screen w-screen flex flex-col box-border overflow-hidden select-none relative">
      {/* Native window resize edge handles */}
      <div onMouseDown={(e) => handleResize(e, "right")} className="fixed top-0 right-0 w-2 h-full cursor-e-resize z-50 select-none" />
      <div onMouseDown={(e) => handleResize(e, "bottom")} className="fixed bottom-0 left-0 w-full h-2 cursor-s-resize z-50 select-none" />
      <div onMouseDown={(e) => handleResize(e, "left")} className="fixed top-0 left-0 w-2 h-full cursor-w-resize z-50 select-none" />
      <div onMouseDown={(e) => handleResize(e, "top")} className="fixed top-0 left-0 w-full h-2 cursor-n-resize z-50 select-none" />
      <div onMouseDown={(e) => handleResize(e, "bottom-right")} className="fixed bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 select-none" />
      <div onMouseDown={(e) => handleResize(e, "bottom-left")} className="fixed bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50 select-none" />

      {/* WINDOW CONTAINER: Frameless native window with Figma titlebar */}
      <div className="ios-glass-window flex flex-col flex-1 overflow-hidden relative">

        {/* 1. BILAH JUDUL (Exact Figma node 2:3, h: 48px, bg: #f7f8fa) */}
        <header
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={handleHeaderDoubleClick}
          className="h-[48px] ios-glass-bar border-b border-[#e7e9ef] dark:border-[#2a2c3d] flex items-center justify-between px-4 relative z-30 flex-shrink-0 cursor-default select-none"
        >
          <div className="flex items-center space-x-3">
            {/* Custom Icon user dengan container rounded 6px ungu #6554c0 */}
            <div className="w-6 h-6 rounded-[6px] bg-[#6554c0] flex items-center justify-center p-0.5 shadow-sm shadow-[#6554c0]/30 overflow-hidden pointer-events-none">
              <img src="/app-icon.png" alt="DownNux" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-[12px] text-[#202631] dark:text-white tracking-tight pointer-events-none">DownNux Manager</span>
            <button
              type="button"
              onClick={() => handleCheckUpdates(true)}
              className="text-[10px] font-bold text-[#6554c0] bg-[#edeaf9] dark:bg-[#6554c0]/20 dark:text-[#a79be8] px-2 py-0.5 rounded-full border border-[#d8d2f5] dark:border-[#4d4287] tracking-wide shadow-xs hover:border-[#6554c0] hover:scale-105 transition-all cursor-pointer flex items-center space-x-1"
              title={lang === "en" ? "Click to check for updates" : "Klik untuk periksa pembaruan"}
            >
              <span>BETA 0.0.3</span>
              {updateInfo?.hasUpdate && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
              )}
            </button>
          </div>

          {/* Dynamic OS indicator matching Figma node 2:18 "Ubuntu · Desktop" */}
          <div className="absolute left-1/2 -translate-x-1/2 font-normal text-[11px] text-[#6e7685] dark:text-[#9ea4b5] pointer-events-none">
            {osName}
          </div>

          {/* Language Switch & Window Control Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-[6px] border border-[#e7e9ef] dark:border-[#2a2c3d] bg-white dark:bg-[#1a1c29] text-[#6e7685] dark:text-[#9ea4b5] hover:text-[#202631] dark:hover:text-white hover:border-[#d0d3de] transition-colors"
              title={lang === "en" ? "Change Language" : "Ganti Bahasa"}
            >
              <Languages className="w-3.5 h-3.5 text-[#6554c0]" />
              <span className="font-semibold">{lang.toUpperCase()}</span>
            </button>

            <div className="h-4 w-[1px] bg-[#e7e9ef] dark:bg-[#2a2c3d]" />

            {/* Window Controls matching exact Figma nodes 2:19, 2:21, 2:23 */}
            <div className="flex items-center space-x-1 text-[#6e7685] dark:text-[#9ea4b5]">
              <button
                onClick={handleMinimize}
                className="w-7 h-7 rounded-[5px] hover:bg-[#e7e9ef] dark:hover:bg-[#25283b] flex items-center justify-center transition-colors text-[#6e7685] hover:text-[#202631] dark:hover:text-white"
                title={lang === "en" ? "Minimize" : "Kecilkan"}
              >
                <Minus className="w-4 h-4 stroke-[2]" />
              </button>
              <button
                onClick={handleMaximize}
                className="w-7 h-7 rounded-[5px] hover:bg-[#e7e9ef] dark:hover:bg-[#25283b] flex items-center justify-center transition-colors text-[#6e7685] hover:text-[#202631] dark:hover:text-white"
                title={lang === "en" ? "Maximize" : "Besarkan"}
              >
                <Square className="w-3.5 h-3.5 stroke-[1.8]" />
              </button>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-[5px] hover:bg-[#e81123] hover:text-white flex items-center justify-center transition-colors text-[#6e7685] dark:text-[#9ea4b5]"
                title={lang === "en" ? "Close" : "Tutup"}
              >
                <X className="w-4 h-4 stroke-[2]" />
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
                          setActiveView("downloads");
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-[12px] transition-all ${active && activeView === "downloads"
                            ? "bg-[#edeaf9] dark:bg-[#6554c0]/20 text-[#6554c0] dark:text-[#a79be8] font-semibold"
                            : "text-[#202631] dark:text-[#e2e4ea] hover:bg-[#edeaf9]/40 dark:hover:bg-[#25283b] hover:text-[#6554c0]"
                          }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 ${active && activeView === "downloads" ? "text-[#6554c0] dark:text-[#a79be8]" : "text-[#6e7685]"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.count > 0 && (
                          <span className={`text-[11px] font-mono ${active && activeView === "downloads" ? "text-[#6554c0] dark:text-[#a79be8]" : "text-[#6e7685]"}`}>
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
                    { id: "torrents", label: t.torrents, icon: Magnet },
                    { id: "video", label: t.video, icon: Film },
                    { id: "music", label: t.music, icon: Music },
                    { id: "documents", label: t.documents, icon: FileText },
                    { id: "compressed", label: t.compressed, icon: Archive },
                    { id: "programs", label: t.programs, icon: Binary },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const active = activeCategory === cat.id && activeView === "downloads";
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setActiveView("downloads");
                        }}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-[6px] text-[12px] transition-all ${active
                            ? "bg-[#edeaf9] dark:bg-[#6554c0]/20 text-[#6554c0] dark:text-[#a79be8] font-semibold"
                            : "text-[#6e7685] hover:bg-[#edeaf9]/40 dark:hover:bg-[#25283b] hover:text-[#202631] dark:hover:text-white"
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
              <div className="h-px bg-[#e7e9ef] dark:bg-[#2a2c3d] my-2" />

              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveView("scheduler")}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-[6px] text-[12px] transition-colors ${activeView === "scheduler"
                      ? "bg-[#edeaf9] dark:bg-[#6554c0]/20 text-[#6554c0] dark:text-[#a79be8] font-semibold"
                      : "text-[#202631] dark:text-[#e2e4ea] hover:bg-[#edeaf9]/40 dark:hover:bg-[#25283b]"
                    }`}
                >
                  <Clock className={`w-4 h-4 ${activeView === "scheduler" ? "text-[#6554c0] dark:text-[#a79be8]" : "text-[#6e7685]"}`} />
                  <span>{lang === "en" ? "Scheduler" : "Penjadwal"}</span>
                </button>
                <button
                  onClick={() => setActiveView("settings")}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-[6px] text-[12px] transition-colors ${activeView === "settings"
                      ? "bg-[#edeaf9] dark:bg-[#6554c0]/20 text-[#6554c0] dark:text-[#a79be8] font-semibold"
                      : "text-[#202631] dark:text-[#e2e4ea] hover:bg-[#edeaf9]/40 dark:hover:bg-[#25283b]"
                    }`}
                >
                  <SettingsIcon className={`w-4 h-4 ${activeView === "settings" ? "text-[#6554c0] dark:text-[#a79be8]" : "text-[#6e7685]"}`} />
                  <span>{t.settings}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckUpdates(true)}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-[6px] text-[12px] transition-colors text-[#202631] dark:text-[#e2e4ea] hover:bg-[#edeaf9]/40 dark:hover:bg-[#25283b]"
                >
                  <RefreshCw className="w-4 h-4 text-[#6e7685]" />
                  <span>{t.checkForUpdates}</span>
                  {updateInfo?.hasUpdate && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] ml-auto animate-ping" />
                  )}
                </button>
              </div>
            </div>

            {/* Koneksi browser (Exact Figma node 2:90: bg: #eef4f1, text: #218163) */}
            <div className="bg-[#eef4f1] dark:bg-[#162720]/80 p-3 rounded-[8px] border border-[#d6e7dc]/70 dark:border-[#224738] mt-2">
              <p className="font-medium text-[11px] text-[#218163] dark:text-[#4ade80] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#218163] dark:bg-[#4ade80] inline-block animate-pulse" />
                {lang === "en" ? "Browser Connected" : "Browser terhubung"}
              </p>
              <p className="font-normal text-[10px] text-[#6e7685] dark:text-[#88998e] mt-1">
                {lang === "en" ? "Chrome / Brave · Ready to capture" : "Chrome · Siap menangkap URL"}
              </p>
            </div>
          </aside>

          {/* AREA KERJA (Workspace) */}
          {activeView === "settings" ? (
            <SettingsView
              lang={lang}
              settings={settingsData}
              onSave={handleSaveSettings}
              onPreview={handlePreviewSettings}
              onBrowseFolder={handleBrowseFolderForTarget}
              onClose={() => setActiveView("downloads")}
            />
          ) : activeView === "scheduler" ? (
            <SchedulerView
              lang={lang}
              config={schedulerConfig}
              tasks={tasks}
              onSave={handleSaveScheduler}
              onRunNow={handleRunSchedulerNow}
              onResumeTask={(id) => executeAction("task.resume", { id })}
            />
          ) : (
            <main className="flex-1 flex flex-col overflow-hidden bg-white/70 dark:bg-[#13141f]/75 backdrop-blur-xl">
              {/* Header Area Kerja: Judul, Subtitle, Search */}
              <div className="p-6 pb-3 space-y-4 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[24px] font-bold text-[#202631] dark:text-white leading-tight">
                      {t.allDownloads}
                    </h2>
                    <p className="text-[12px] text-[#6e7685] dark:text-[#a0a6b8] mt-1">
                      {lang === "en"
                        ? "Manage your downloads. Fast, organized, uninterrupted."
                        : "Kelola unduhanmu. Cepat, teratur, tanpa terputus."}
                    </p>
                  </div>

                  {/* Pencarian (Figma w: 308px, h: 36px, bg: #f7f8fa) */}
                  <div className="relative w-[308px] h-[36px] bg-[#f7f8fa] dark:bg-[#1a1c29] rounded-[6px] border border-[#e7e9ef] dark:border-[#2a2c3d] flex items-center px-3 shadow-inner">
                    <Search className="w-4 h-4 text-[#6e7685] dark:text-[#a0a6b8] mr-2" />
                    <input
                      type="text"
                      placeholder={lang === "en" ? "Search file name or URL..." : "Cari nama file atau URL..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none text-[12px] text-[#202631] dark:text-white placeholder-[#6e7685] dark:placeholder-[#6e7487] focus:outline-none w-full"
                    />
                    <span className="text-[10px] text-[#6e7685] dark:text-[#888e9e] font-mono ml-1">Ctrl K</span>
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
                    className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-2 disabled:opacity-40 flex-shrink-0"
                  >
                    <Play className="w-4 h-4 text-[#202631] dark:text-[#d1d5e0]" />
                    <span>{t.resume}</span>
                  </button>

                  <button
                    disabled={!selectedTask || selectedTask.status !== "downloading"}
                    onClick={() => selectedTask && executeAction("task.pause", { id: selectedTask.id })}
                    className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-2 disabled:opacity-40 flex-shrink-0"
                  >
                    <Pause className="w-4 h-4 text-[#202631] dark:text-[#d1d5e0]" />
                    <span>{t.pause}</span>
                  </button>

                  <button
                    disabled={!selectedTask || selectedTask.status === "completed"}
                    onClick={() => selectedTask && executeAction("task.cancel", { id: selectedTask.id })}
                    className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-2 disabled:opacity-40 flex-shrink-0"
                  >
                    <XCircle className="w-4 h-4 text-[#202631] dark:text-[#d1d5e0]" />
                    <span>{t.cancel}</span>
                  </button>

                  <button
                    disabled={!selectedTask}
                    onClick={() => selectedTask && executeAction("task.remove", { id: selectedTask.id, deleteFile: false })}
                    className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-2 disabled:opacity-40 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-[#202631] dark:text-[#d1d5e0]" />
                    <span>{t.delete}</span>
                  </button>

                  <button
                    onClick={() => executeAction("task.pauseAll")}
                    className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-2 flex-shrink-0"
                  >
                    <PauseCircle className="w-4 h-4 text-[#202631] dark:text-[#d1d5e0]" />
                    <span>{t.pauseAll}</span>
                  </button>

                  <div className="flex-1" />

                  <button className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-2 flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#6e7685] dark:text-[#a0a6b8]" />
                    <span>{lang === "en" ? "Recent" : "Terbaru"}</span>
                  </button>
                </div>

                {/* Filter Tabs (Exact Figma: "All" with indicator line #6554c0, "Active", "Completed") */}
                <div className="flex items-center justify-between pt-2 border-b border-[#e7e9ef] dark:border-[#2a2c3d]">
                  <div className="flex items-center space-x-6">
                    <button
                      onClick={() => setActiveFilter("all")}
                      className={`pb-2 text-[12px] relative transition-colors ${activeFilter === "all" ? "text-[#6554c0] dark:text-[#a79be8] font-semibold" : "text-[#6e7685] hover:text-[#202631] dark:text-[#9ea4b5] dark:hover:text-white"
                        }`}
                    >
                      {lang === "en" ? "All" : "Semua"}
                      <span className="text-[10px] text-[#6e7685] dark:text-[#9ea4b5] font-normal ml-1.5">{tasks.length}</span>
                      {activeFilter === "all" && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6554c0] dark:bg-[#a79be8]" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveFilter("downloading")}
                      className={`pb-2 text-[12px] relative transition-colors ${activeFilter === "downloading"
                        ? "text-[#6554c0] dark:text-[#a79be8] font-semibold"
                        : "text-[#6e7685] hover:text-[#202631] dark:text-[#9ea4b5] dark:hover:text-white"
                        }`}
                    >
                      {lang === "en" ? "Active" : "Aktif"}
                      {activeFilter === "downloading" && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6554c0] dark:bg-[#a79be8]" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveFilter("completed")}
                      className={`pb-2 text-[12px] relative transition-colors ${activeFilter === "completed"
                        ? "text-[#6554c0] dark:text-[#a79be8] font-semibold"
                        : "text-[#6e7685] hover:text-[#202631] dark:text-[#9ea4b5] dark:hover:text-white"
                        }`}
                    >
                      {lang === "en" ? "Completed" : "Selesai"}
                      {activeFilter === "completed" && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6554c0] dark:bg-[#a79be8]" />
                      )}
                    </button>
                  </div>
                  <span className="text-[11px] text-[#6e7685] dark:text-[#9ea4b5]">
                    {selectedTask ? (lang === "en" ? "1 selected" : "1 dipilih") : (lang === "en" ? "0 selected" : "0 dipilih")}
                  </span>
                </div>
              </div>

              {/* TABEL DAFTAR UNDUHAN */}
              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[6px] overflow-hidden ios-glass-card">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#f7f8fa] dark:bg-[#181a28] text-[#6e7685] dark:text-[#9ea4b5] font-medium border-b border-[#e7e9ef] dark:border-[#2a2c3d] text-[10px]">
                        <th className="py-2.5 px-4 w-80">{t.filename}</th>
                        <th className="py-2.5 px-3 w-28">{t.size}</th>
                        <th className="py-2.5 px-3 w-40">{t.status} / {t.progress}</th>
                        <th className="py-2.5 px-3 w-28">{t.speed}</th>
                        <th className="py-2.5 px-3 w-24">{t.eta}</th>
                        <th className="py-2.5 px-3 w-32">{t.added}</th>
                        <th className="py-2.5 px-3 text-right">{lang === "en" ? "Action" : "Aksi"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e7e9ef] dark:divide-[#242738]">
                      {filteredTasks.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-[#6e7685] dark:text-[#888e9e]">
                            <Folder className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#6554c0] dark:text-[#a79be8]" />
                            <p className="text-[12px] font-medium text-[#202631] dark:text-white">
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
                          const FileIcon = getFileIcon(task.filename || task.url, task.url, task.isTorrent);

                          let hostname = "";
                          try {
                            hostname = new URL(task.url).hostname;
                          } catch {
                            hostname = task.url.startsWith("magnet:?") ? "magnet: P2P Swarm" : task.url;
                          }

                          return (
                            <tr
                              key={task.id}
                              onClick={() => setSelectedId(task.id)}
                              onDoubleClick={() => {
                                if (task.status === "completed") {
                                  handleOpenFile(task);
                                } else {
                                  setInspectingTaskId(task.id);
                                }
                              }}
                              title={
                                task.status === "completed"
                                  ? (lang === "en" ? "Double click to open file" : "Klik 2x untuk buka file")
                                  : (lang === "en" ? "Double click to inspect segments & speed (IDM Dialog)" : "Klik 2x untuk buka inspektor segmen & kecepatan (IDM)")
                              }
                              className={`cursor-pointer transition-colors relative ${isSelected
                                  ? "bg-[#edeaf9] dark:bg-[#6554c0]/25 text-[#202631] dark:text-white"
                                  : "hover:bg-[#fbfbfd] dark:hover:bg-[#1c1e2d] bg-white/70 dark:bg-[#151724]/70 text-[#202631] dark:text-[#e2e4ea]"
                                }`}
                            >
                              <td className="py-2.5 px-4 max-w-xs relative">
                                {/* Penanda pilihan ungu #6554c0 */}
                                {isSelected && (
                                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#6554c0] dark:bg-[#a79be8]" />
                                )}
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[#e5def8] dark:bg-[#342e54]" : "bg-[#f1f3f6] dark:bg-[#202334]"
                                      }`}
                                  >
                                    <FileIcon
                                      className={`w-4 h-4 ${isSelected ? "text-[#6554c0] dark:text-[#a79be8]" : "text-[#6e7685] dark:text-[#9ea4b5]"}`}
                                    />
                                  </div>
                                  <div className="truncate">
                                    <p className="font-semibold text-[11px] text-[#202631] dark:text-white truncate">
                                      {task.filename || task.url}
                                    </p>
                                    <p className="text-[9px] text-[#6e7685] dark:text-[#888e9e] truncate">
                                      {hostname}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-[#202631] dark:text-[#e2e4ea] whitespace-nowrap">
                                {fmtBytes(task.totalBytes || task.completedBytes)}
                              </td>

                              {/* Status & Progress bar (IDM enhanced visual) */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex justify-between items-center mb-1">
                                  <span
                                    className={`font-semibold text-[10px] flex items-center gap-1.5 ${task.status === "completed"
                                      ? "text-[#218163] dark:text-[#38d49a]"
                                      : task.status === "paused"
                                        ? "text-[#ac8433] dark:text-[#fbbf24]"
                                        : task.status === "failed"
                                          ? "text-[#c34a4a] dark:text-[#f87171]"
                                          : "text-[#6554c0] dark:text-[#a79be8]"
                                      }`}
                                  >
                                    {task.status === "downloading" && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#6554c0] dark:bg-[#a79be8] animate-ping" />
                                    )}
                                    {getStatusText(task.status)}
                                  </span>
                                  <span className="font-bold text-[10px] text-[#6554c0] dark:text-[#a79be8]">
                                    {task.status === "completed" ? "100%" : `${pct.toFixed(0)}%`}
                                  </span>
                                </div>
                                <div className="w-[142px] h-[6px] bg-[#e3e4ea] dark:bg-[#252838] rounded-[3px] overflow-hidden p-[0.5px]">
                                  <div
                                    className={`h-full rounded-[2px] transition-all duration-300 ${task.status === "completed"
                                      ? "bg-[#218163] dark:bg-[#38d49a]"
                                      : task.status === "paused"
                                        ? "bg-[#ac8433] dark:bg-[#fbbf24]"
                                        : task.status === "failed"
                                          ? "bg-[#c34a4a] dark:bg-[#f87171]"
                                          : "bg-gradient-to-r from-[#6554c0] via-[#8675ea] to-[#6554c0] animate-pulse"
                                      }`}
                                    style={{ width: `${task.status === "completed" ? 100 : Math.min(100, Math.max(2, pct))}%` }}
                                  />
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-[#202631] dark:text-[#e2e4ea] whitespace-nowrap font-semibold text-[11px]">
                                {task.status === "downloading" ? (
                                  <span className="text-[#6554c0] dark:text-[#a79be8] flex items-center gap-1">
                                    <ArrowDown className="w-3 h-3 text-[#6554c0] dark:text-[#a79be8] animate-bounce" />
                                    {fmtBytes(task.speed)}/s
                                  </span>
                                ) : "—"}
                              </td>

                              <td className="py-2.5 px-3 text-[#6e7685] dark:text-[#888e9e] whitespace-nowrap">
                                {task.status === "downloading" ? fmtTime(etaSec, lang) : "—"}
                              </td>

                              <td className="py-2.5 px-3 text-[#6e7685] dark:text-[#888e9e] text-[10px] whitespace-nowrap">
                                {lang === "en" ? "Today" : "Hari ini"}, {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>

                              <td className="py-2.5 px-3 text-right relative">
                                <div className="inline-flex items-center space-x-1 action-menu-container">
                                  {/* Quick action button: Play/Open for completed, Pause for downloading, Resume for paused, Repair for failed */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (task.status === "completed") handleOpenFile(task);
                                      else if (task.status === "downloading") executeAction("task.pause", { id: task.id });
                                      else if (task.status === "paused") executeAction("task.resume", { id: task.id });
                                      else if (task.status === "failed") handleRepair(task);
                                    }}
                                    title={
                                      task.status === "completed"
                                        ? (lang === "en" ? "Open File" : "Buka File")
                                        : task.status === "downloading"
                                        ? (lang === "en" ? "Pause" : "Jeda")
                                        : task.status === "paused"
                                        ? (lang === "en" ? "Resume" : "Lanjutkan")
                                        : (lang === "en" ? "Repair / Retry" : "Perbaiki / Unduh Ulang")
                                    }
                                    className="w-7 h-7 rounded-[6px] hover:bg-[#edeaf9] dark:hover:bg-[#2a2840] inline-flex items-center justify-center text-[#6554c0] dark:text-[#a79be8] transition-colors"
                                  >
                                    {task.status === "downloading" ? (
                                      <Pause className="w-3.5 h-3.5" />
                                    ) : task.status === "failed" ? (
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    ) : (
                                      <Play className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {/* More actions button (3-dots) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuId(openActionMenuId === task.id ? null : task.id);
                                    }}
                                    title={t.moreActions}
                                    className="w-7 h-7 rounded-[6px] hover:bg-[#edeaf9] dark:hover:bg-[#2a2840] inline-flex items-center justify-center text-[#6e7685] hover:text-[#202631] dark:hover:text-white transition-colors"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Dropdown Menu */}
                                  {openActionMenuId === task.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-3 top-9 z-50 w-52 bg-white/95 dark:bg-[#181a28]/95 backdrop-blur-xl border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[8px] shadow-2xl py-1 text-[11px] font-medium text-[#202631] dark:text-white"
                                    >
                                      {/* 1. Open File */}
                                      <button
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleOpenFile(task);
                                        }}
                                        disabled={task.status !== "completed"}
                                        className="w-full px-3 py-2 flex items-center space-x-2 hover:bg-[#f7f8fa] dark:hover:bg-[#25283b] disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors"
                                      >
                                        <Play className="w-3.5 h-3.5 text-[#218163] dark:text-[#38d49a]" />
                                        <span className="flex-1">{t.openFile}</span>
                                        {task.status !== "completed" && (
                                          <span className="text-[9px] text-[#6e7685]">({lang === "en" ? "Wait done" : "Belum selesai"})</span>
                                        )}
                                      </button>

                                      {/* 2. Open Folder Directory */}
                                      <button
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleOpenFolder(task);
                                        }}
                                        className="w-full px-3 py-2 flex items-center space-x-2 hover:bg-[#f7f8fa] dark:hover:bg-[#25283b] text-left transition-colors"
                                      >
                                        <FolderOpen className="w-3.5 h-3.5 text-[#6554c0] dark:text-[#a79be8]" />
                                        <span>{t.openFolder}</span>
                                      </button>

                                      {/* 3. Inspect Segments (IDM Visualizer) */}
                                      <button
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          setInspectingTaskId(task.id);
                                        }}
                                        className="w-full px-3 py-2 flex items-center space-x-2 hover:bg-[#f7f8fa] dark:hover:bg-[#25283b] text-left transition-colors text-[#3b82f6]"
                                      >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                        <span>{lang === "en" ? "Inspect Segments (IDM)" : "Inspeksi Segmen (IDM)"}</span>
                                      </button>

                                      {/* 4. Repair / Re-download */}
                                      <button
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleRepair(task);
                                        }}
                                        className="w-full px-3 py-2 flex items-center space-x-2 hover:bg-[#f7f8fa] dark:hover:bg-[#25283b] text-left text-[#ac8433] dark:text-[#fbbf24] transition-colors"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>{t.repair}</span>
                                      </button>

                                      <div className="border-t border-[#e7e9ef] dark:border-[#2a2c3d] my-1" />

                                      {/* 5. Delete (from list & storage disk) */}
                                      <button
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleDeleteWithFile(task);
                                        }}
                                        className="w-full px-3 py-2 flex items-center space-x-2 hover:bg-[#fee2e2] dark:hover:bg-[#451a1a] text-[#dc2626] dark:text-[#f87171] text-left transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{t.deleteFromDisk}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
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
                  <div className="mt-3 p-4 bg-white/70 dark:bg-[#161826]/80 border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[8px] ios-glass-card space-y-3">
                    <div className="flex items-center justify-between border-b border-[#e7e9ef] dark:border-[#2a2c3d] pb-3">
                      <div>
                        <h3 className="font-semibold text-[12px] text-[#202631] dark:text-white">
                          {selectedTask.filename || selectedTask.url}
                        </h3>
                        <p className="font-normal text-[10px] text-[#6e7685] dark:text-[#9ea4b5] mt-0.5">
                          {fmtBytes(selectedTask.completedBytes)} {lang === "en" ? "of" : "dari"} {fmtBytes(selectedTask.totalBytes)} ·{" "}
                          {selectedTask.connections || 8} {lang === "en" ? "active connections · Resume supported" : "koneksi aktif · Resume didukung"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setInspectingTaskId(selectedTask.id)}
                          className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-2 border border-[#6554c0]/30 hover:border-[#6554c0]"
                          title={lang === "en" ? "Inspect Segments & Speed" : "Inspeksi Segmen & Kecepatan"}
                        >
                          <Maximize2 className="w-4 h-4 text-[#6554c0] dark:text-[#a79be8]" />
                          <span>{lang === "en" ? "Inspect" : "Inspeksi"}</span>
                        </button>
                        <button
                          onClick={() => {
                            executeAction("task.openFolder", { id: selectedTask.id });
                            postWindowMessage(`openFolder:${selectedTask.dir || ""}`);
                          }}
                          className="h-[36px] px-3.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium flex items-center space-x-2"
                        >
                          <FolderOpen className="w-4 h-4 text-[#6e7685] dark:text-[#a79be8]" />
                          <span>{lang === "en" ? "Open Folder" : "Buka folder"}</span>
                        </button>
                      </div>
                    </div>

                    {/* TRANSFER STATS & PROGRES PER KONEKSI (Exact Figma layout) */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Kecepatan transfer */}
                      <div className="col-span-5 flex flex-col justify-between border-r border-[#e7e9ef] dark:border-[#2a2c3d] pr-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[9px] font-semibold text-[#6e7685] dark:text-[#9ea4b5] uppercase tracking-wide">
                              {lang === "en" ? "TRANSFER SPEED" : "KECEPATAN TRANSFER"}
                            </p>
                            <div className="flex items-baseline space-x-1 mt-1">
                              <span className="text-[24px] font-semibold text-[#202631] dark:text-white leading-none">
                                {selectedTask.status === "downloading"
                                  ? (selectedTask.speed / (1024 * 1024)).toFixed(1).replace(".", ",")
                                  : "0,0"}
                              </span>
                              <span className="text-[11px] text-[#6e7685] dark:text-[#9ea4b5]">MB/s</span>
                            </div>
                            <p className="text-[10px] text-[#6e7685] dark:text-[#9ea4b5] mt-1">
                              {lang === "en" ? "Average" : "Rata-rata"} {(selectedTask.speed > 0 ? (selectedTask.speed / (1024 * 1024) * 0.95).toFixed(1) : "0,0").replace(".", ",")} MB/s
                            </p>
                          </div>

                          {/* Dynamic Speed Graph SVG */}
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
                                  <stop offset="0%" stopColor="#6554C0" stopOpacity="0.35" />
                                  <stop offset="100%" stopColor="#6554C0" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <path
                                d={speedSvgPaths.line}
                                strokeWidth="2"
                                stroke="#6554C0"
                              />
                              <path
                                d={speedSvgPaths.area}
                                fill="url(#speedGrad)"
                              />
                            </svg>
                          </div>
                        </div>

                        <div className="flex justify-between text-[9px] text-[#6e7685] dark:text-[#9ea4b5] mt-1 pt-1">
                          <span>{lang === "en" ? "60s ago" : "60 d lalu"}</span>
                          <span>{lang === "en" ? "Now" : "Sekarang"}</span>
                        </div>
                      </div>

                      {/* Progres per koneksi (Figma 8 segmen paralel) atau Torrent Swarm */}
                      <div className="col-span-7">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-semibold text-[#6e7685] dark:text-[#9ea4b5] uppercase tracking-wide">
                            {selectedTask.isTorrent
                              ? (lang === "en" ? "BITTORRENT SWARM" : "SWARM BITTORRENT")
                              : (lang === "en" ? "PROGRESS PER CONNECTION" : "PROGRES PER KONEKSI")}
                          </p>
                          {selectedTask.isTorrent && (
                            <span className="text-[10px] text-[#218163] dark:text-[#38d49a] font-medium flex items-center gap-1">
                              <Radio className="w-3 h-3" />
                              {selectedTask.numSeeders || 0} {lang === "en" ? "seeders" : "seeder"}
                            </span>
                          )}
                        </div>
                        {selectedTask.isTorrent ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-[#6e7685] dark:text-[#9ea4b5]">
                              <span className="flex items-center gap-1">
                                <ArrowUp className="w-3 h-3 text-[#3b82f6]" />
                                {lang === "en" ? "Upload:" : "Unggah:"} {(selectedTask.uploadSpeed ? (selectedTask.uploadSpeed / (1024 * 1024)).toFixed(2) : "0.00")} MB/s
                              </span>
                              <span>
                                {selectedTask.numPieces ? `${selectedTask.numPieces} ${lang === "en" ? "pieces" : "bagian"}` : "P2P Mesh"}
                              </span>
                            </div>
                            <div className="h-[7px] bg-[#eceaf4] dark:bg-[#252838] rounded-[3px] overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#6554c0] to-[#3b82f6] rounded-[3px] transition-all duration-300"
                                style={{
                                  width: `${selectedTask.totalBytes > 0
                                    ? Math.min(100, (selectedTask.completedBytes / selectedTask.totalBytes) * 100)
                                    : 0}%`
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                            {Array.from({ length: selectedTask.connections || 8 }).map((_, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <span className="text-[9px] text-[#6e7685] dark:text-[#9ea4b5] font-mono">
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                <div className="flex-1 h-[5px] bg-[#eceaf4] dark:bg-[#252838] rounded-[2px] overflow-hidden">
                                  <div
                                    className="h-full bg-[#6554c0] dark:bg-[#8b7ce0] rounded-[2px] transition-all duration-300"
                                    style={{
                                      width: `${selectedTask.status === "downloading"
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
                        )}
                        <p className="text-[9px] text-[#6e7685] dark:text-[#9ea4b5] mt-2">
                          {lang === "en" ? "Location:" : "Lokasi:"} {selectedTask.dir || "~/Downloads"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. STATUS LAYANAN (Exact Figma Node 2:6, h: 36px, bg: #f7f8fa) */}
              <footer className="h-[36px] ios-glass-bar border-t border-[#e7e9ef] dark:border-[#2a2c3d] px-4 flex items-center justify-between text-[11px] text-[#202631] dark:text-[#d1d5e0] flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <span className="text-[#218163] dark:text-[#38d49a] font-medium flex items-center gap-1.5">
                    <span className="text-[10px]">●</span>{" "}
                    {lang === "en" ? "Background service active" : "Layanan background aktif"}
                  </span>
                  <span className="text-[#6e7685] dark:text-[#9ea4b5]">
                    {lang === "en"
                      ? "Downloads continue when window is closed"
                      : "Unduhan tetap berjalan saat jendela ditutup"}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-[#6e7685] dark:text-[#9ea4b5]">
                  <span className="text-[#202631] dark:text-white font-medium flex items-center gap-1.5">
                    ↓ {fmtBytes(totalSpeed)}/s
                    {settingsData.speedLimiterEnabled && settingsData.speedLimitBytesPerSec > 0 && (
                      <span className="text-[10px] text-[#6554c0] dark:text-[#a79be8] bg-[#edeaf9] dark:bg-[#6554c0]/20 px-1.5 py-0.5 rounded font-semibold">
                        {lang === "en" ? `Limit: ${fmtBytes(settingsData.speedLimitBytesPerSec)}/s` : `Batas: ${fmtBytes(settingsData.speedLimitBytesPerSec)}/s`}
                      </span>
                    )}
                  </span>
                  <span>{lang === "en" ? "Available storage: 128 GB" : "Ruang tersedia: 128 GB"}</span>
                </div>
              </footer>
            </main>
          )}
        </div>
      </div>

      {/* DIALOG TAMBAH URL (IDM Download File Information Mode) */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-[#181a28]/95 backdrop-blur-2xl border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[12px] w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e7e9ef] dark:border-[#2a2c3d] pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-[#6554c0] flex items-center justify-center text-white">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-[13px] font-semibold text-[#202631] dark:text-white">{t.fileInfo}</h2>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setProbeResult(null);
                }}
                className="w-6 h-6 rounded hover:bg-[#f7f8fa] dark:hover:bg-[#25283b] flex items-center justify-center text-[#6e7685] hover:text-[#202631] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-[12px]">
              {/* URL Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#6e7685] dark:text-[#9ea4b5] font-medium">{t.enterUrl}</label>
                  <button
                    type="button"
                    onClick={() => torrentFileInputRef.current?.click()}
                    className="text-[11px] text-[#6554c0] dark:text-[#a79be8] hover:underline font-normal cursor-pointer flex items-center gap-1"
                  >
                    <Magnet className="w-3 h-3" />
                    <span>{lang === "en" ? "Select .torrent file" : "Pilih file .torrent"}</span>
                  </button>
                  <input
                    type="file"
                    ref={torrentFileInputRef}
                    accept=".torrent"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleTorrentFileSelected(f);
                    }}
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="https://example.com/file.zip or magnet:?xt=... or YouTube URL"
                    value={newUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="w-full bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[6px] px-3 py-2 text-[#202631] dark:text-white focus:outline-none focus:border-[#6554c0] pr-8"
                  />
                  {isProbing && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-[#6554c0] animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* IDM Metadata Preview Card (Estimated Size, Resume Support, Category) */}
              {isProbing ? (
                <div className="bg-[#edeaf9]/40 dark:bg-[#6554c0]/15 border border-[#d8d2f5] dark:border-[#4d4287] rounded-[8px] p-3 flex items-center space-x-2.5 text-[11px] text-[#6554c0] dark:text-[#a79be8]">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span className="font-medium">{t.inspectingUrl}</span>
                </div>
              ) : probeResult ? (
                <div className="bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[8px] p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#6e7685] dark:text-[#9ea4b5] font-medium">{t.estimatedSize}:</span>
                    <span className="font-bold text-[#202631] dark:text-white bg-white dark:bg-[#1a1c29] px-2.5 py-0.5 rounded border border-[#e7e9ef] dark:border-[#2a2c3d] shadow-xs">
                      {probeResult.formattedSize}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#6e7685] dark:text-[#9ea4b5] font-medium">Resume Capability:</span>
                    <span className={`font-semibold flex items-center gap-1 ${probeResult.resumeSupported ? "text-[#218163] dark:text-[#38d49a]" : "text-[#ac8433] dark:text-[#fbbf24]"
                      }`}>
                      {probeResult.resumeSupported ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> {t.resumeSupported}
                        </>
                      ) : (
                        t.resumeNotSupported
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#6e7685] dark:text-[#9ea4b5] font-medium">{t.categoryLabel}:</span>
                    <span className="font-semibold text-[#6554c0] dark:text-[#a79be8] uppercase tracking-wider text-[10px] bg-[#edeaf9] dark:bg-[#6554c0]/20 px-2 py-0.5 rounded">
                      {probeResult.category}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* File Name (Editable Description) */}
              <div>
                <label className="block text-[#6e7685] dark:text-[#9ea4b5] mb-1 font-medium">{t.customFilename}</label>
                <input
                  type="text"
                  placeholder={
                    isMediaUrl
                      ? downloadFormat === "mp3"
                        ? "(Auto detect title · .mp3)"
                        : "(Auto detect title · .mp4)"
                      : "filename.ext"
                  }
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  className="w-full bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[6px] px-3 py-2 text-[#202631] dark:text-white focus:outline-none focus:border-[#6554c0]"
                />
              </div>

              {/* Save Folder Destination with Browse Button (IDM Feature) */}
              <div>
                <label className="block text-[#6e7685] dark:text-[#9ea4b5] mb-1 font-medium">{t.saveFolder}</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="~/Downloads"
                    value={saveDir}
                    onChange={(e) => setSaveDir(e.target.value)}
                    className="flex-1 bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[6px] px-3 py-2 text-[#202631] dark:text-white focus:outline-none focus:border-[#6554c0] text-[11px] font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSelectFolder}
                    className="h-[34px] px-3 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[11px] font-medium flex items-center space-x-1.5 flex-shrink-0"
                    title={lang === "en" ? "Browse Folder" : "Pilih Folder"}
                  >
                    <Folder className="w-3.5 h-3.5 text-[#6554c0]" />
                    <span>{t.browseFolder}</span>
                  </button>
                </div>
              </div>

              {/* Format selection pills for online video / audio */}
              {isMediaUrl && (
                <div>
                  <label className="block text-[#6e7685] dark:text-[#9ea4b5] mb-1 font-medium">{lang === "en" ? "Format Preset:" : "Format Download:"}</label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadFormat("mp4");
                        if (newFilename.endsWith(".mp3")) {
                          setNewFilename(newFilename.replace(/\.mp3$/, ".mp4"));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-[6px] text-[11px] font-semibold border transition-all ${downloadFormat === "mp4"
                          ? "bg-[#6554c0] text-white border-[#5a4ab0] shadow-sm"
                          : "bg-white dark:bg-[#1a1c29] text-[#202631] dark:text-white border-[#e7e9ef] dark:border-[#2a2c3d] hover:bg-[#f7f8fa] dark:hover:bg-[#25283b]"
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
                      className={`px-3 py-1.5 rounded-[6px] text-[11px] font-semibold border transition-all ${downloadFormat === "mp3"
                          ? "bg-[#6554c0] text-white border-[#5a4ab0] shadow-sm"
                          : "bg-white dark:bg-[#1a1c29] text-[#202631] dark:text-white border-[#e7e9ef] dark:border-[#2a2c3d] hover:bg-[#f7f8fa] dark:hover:bg-[#25283b]"
                        }`}
                    >
                      🎵 Audio Only (MP3)
                    </button>
                  </div>
                </div>
              )}

              {/* Parallel Connections (IDM Multi-threaded Segmentation) */}
              <div>
                <label className="block text-[#6e7685] dark:text-[#9ea4b5] mb-1 font-medium">{t.connections}</label>
                <div className="flex items-center space-x-2">
                  {[1, 4, 8, 16].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNewConnections(num)}
                      className={`px-3 py-1 rounded-[6px] text-[11px] font-medium border transition-colors ${newConnections === num
                          ? "bg-[#6554c0] text-white border-[#5a4ab0]"
                          : "bg-[#f7f8fa] dark:bg-[#1a1c29] text-[#202631] dark:text-white border-[#e7e9ef] dark:border-[#2a2c3d] hover:bg-[#eceaf4] dark:hover:bg-[#25283b]"
                        }`}
                    >
                      {num} {lang === "en" ? "conns" : "koneksi"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons (IDM style: Cancel, Download Later, Start Download) */}
            <div className="flex items-center justify-between pt-3 border-t border-[#e7e9ef] dark:border-[#2a2c3d]">
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setProbeResult(null);
                }}
                className="px-3.5 py-1.5 rounded-[6px] bg-[#f7f8fa] dark:bg-[#1a1c29] hover:bg-[#e7e9ef] dark:hover:bg-[#25283b] text-[#202631] dark:text-white text-[12px] font-medium"
              >
                {t.cancelAction}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleAddDownload(false)}
                  className="px-3.5 py-1.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[12px] font-medium"
                  title="Add to queue in paused state"
                >
                  {t.downloadLater}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddDownload(true)}
                  className="px-4 py-1.5 rounded-[6px] ios-button-primary text-white text-[12px] font-medium shadow-sm"
                >
                  {t.startDownloadBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG KELUAR TRAY */}
      {isExitDialogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-[#181a28]/95 backdrop-blur-xl border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[10px] w-full max-w-sm p-5 shadow-2xl space-y-3">
            <h2 className="text-[14px] font-semibold text-[#202631] dark:text-white">{t.exitDialogTitle}</h2>
            <p className="text-[12px] text-[#6e7685] dark:text-[#9ea4b5] leading-relaxed">{t.exitDialogMsg}</p>
            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsExitDialogOpen(false);
                  postWindowMessage("close");
                }}
                className="w-full py-2 px-3 rounded-[6px] ios-button-primary text-white text-[12px] font-medium"
              >
                {t.exitKeepDownloading}
              </button>
              <button
                onClick={async () => {
                  await executeAction("task.pauseAll");
                  setIsExitDialogOpen(false);
                  postWindowMessage("close");
                }}
                className="w-full py-2 px-3 rounded-[6px] bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] hover:bg-[#e7e9ef] dark:hover:bg-[#25283b] text-[#202631] dark:text-white text-[12px] font-medium"
              >
                {t.exitPauseAll}
              </button>
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-1.5 px-3 rounded-[6px] text-[#6e7685] dark:text-[#9ea4b5] hover:text-[#202631] dark:hover:text-white text-[12px]"
              >
                {t.cancelAction}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DETAIL UNDUHAN & INSPEKTOR SEGMEN MODAL (IDM Style) */}
      {inspectingTask && (
        <DownloadDetailModal
          task={inspectingTask}
          lang={lang}
          onClose={() => setInspectingTaskId(null)}
          onAction={executeAction}
        />
      )}

      {/* UPDATE CHECKER MODAL */}
      {isUpdateModalOpen && (
        <UpdateModal
          lang={lang}
          updateInfo={updateInfo}
          isChecking={isCheckingUpdate}
          onCheck={() => handleCheckUpdates(true)}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}
    </div>
  );
}
