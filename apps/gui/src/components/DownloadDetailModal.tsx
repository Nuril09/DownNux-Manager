import { useState, useMemo } from "react";
import {
  X,
  Play,
  Pause,
  FolderOpen,
  Activity,
  Layers,
  Magnet,
  Radio,
  CheckCircle2,
  ArrowUp,
  Download,
} from "lucide-react";
import type { Task } from "../App";
import { type Lang } from "../i18n";

interface DownloadDetailModalProps {
  task: Task;
  lang: Lang;
  onClose: () => void;
  onAction: (method: string, params: Record<string, unknown>) => void;
}

function fmtBytes(n: number): string {
  if (!n || n <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`.replace(".", ",");
}

function fmtTime(sec: number, lang: Lang): string {
  if (!isFinite(sec) || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)} ${lang === "en" ? "s" : "d"}`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return `${m} ${lang === "en" ? "m" : "m"} ${s} ${lang === "en" ? "s" : "d"}`;
  const h = Math.floor(sec / 3600);
  const remM = Math.floor((sec % 3600) / 60);
  return `${h} ${lang === "en" ? "h" : "j"} ${remM} ${lang === "en" ? "m" : "m"}`;
}

export function DownloadDetailModal({ task, lang, onClose, onAction }: DownloadDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"speed" | "segments" | "torrent">(
    task.isTorrent ? "torrent" : "segments"
  );

  const pct = useMemo(() => {
    if (!task.totalBytes || task.totalBytes <= 0) {
      return task.status === "completed" ? 100 : 0;
    }
    return Math.min(100, Math.max(0, (task.completedBytes / task.totalBytes) * 100));
  }, [task.completedBytes, task.totalBytes, task.status]);

  const etaSec = useMemo(() => {
    if (task.status !== "downloading" || task.speed <= 0 || task.totalBytes <= 0) return 0;
    const rem = task.totalBytes - task.completedBytes;
    return rem > 0 ? rem / task.speed : 0;
  }, [task.status, task.speed, task.totalBytes, task.completedBytes]);

  const history = useMemo(() => {
    const raw = task.speedHistory && task.speedHistory.length > 0 ? task.speedHistory : [task.speed];
    // Pad to at least 20 points for smooth graph display
    if (raw.length < 20) {
      const padded = Array(20 - raw.length).fill(raw[0] || 0).concat(raw);
      return padded;
    }
    return raw;
  }, [task.speedHistory, task.speed]);

  const maxSpeed = useMemo(() => {
    const mx = Math.max(...history, 1024);
    return mx * 1.15; // 15% headroom
  }, [history]);

  const avgSpeed = useMemo(() => {
    if (!history.length) return 0;
    const sum = history.reduce((a, b) => a + b, 0);
    return sum / history.length;
  }, [history]);

  // Generate SVG path points for real-time speed wave
  const { pathD, areaD } = useMemo(() => {
    const W = 540;
    const H = 140;
    const n = history.length;
    if (n < 2) return { pathD: `M 0 ${H} L ${W} ${H}`, areaD: `M 0 ${H} L ${W} ${H} Z` };

    const pts = history.map((val, idx) => {
      const x = (idx / (n - 1)) * W;
      const y = H - (val / maxSpeed) * (H - 15) - 5;
      return { x, y: Math.max(5, Math.min(H, y)) };
    });

    let p = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const cx = (prev.x + cur.x) / 2;
      p += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${((prev.y + cur.y) / 2).toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    p += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

    const a = `${p} L ${W} ${H} L 0 ${H} Z`;
    return { pathD: p, areaD: a };
  }, [history, maxSpeed]);

  // IDM 32/64 Micro-Segments Grid
  const totalSegments = 32;
  const activeSegmentCount = Math.min(totalSegments, Math.max(1, task.activeConnections || task.connections || 8));
  const completedSegments = Math.floor((pct / 100) * totalSegments);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 dark:bg-[#181a28]/95 backdrop-blur-2xl border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[14px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e7e9ef] dark:border-[#2a2c3d] flex items-center justify-between flex-shrink-0 bg-white/40 dark:bg-[#151724]/60">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 text-white ${
              task.isTorrent ? "bg-gradient-to-tr from-[#7c3aed] to-[#a855f7]" : "bg-[#6554c0]"
            }`}>
              {task.isTorrent ? <Magnet className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-[#202631] dark:text-white truncate" title={task.filename || task.url}>
                {task.filename || task.url}
              </h2>
              <div className="flex items-center space-x-2 text-[10px] text-[#6e7685] dark:text-[#9ea4b5] mt-0.5">
                <span className={`font-semibold uppercase tracking-wider ${
                  task.status === "downloading" ? "text-[#218163] dark:text-[#38d49a]" :
                  task.status === "completed" ? "text-[#6554c0] dark:text-[#a79be8]" :
                  task.status === "paused" ? "text-[#ac8433] dark:text-[#fbbf24]" : "text-[#d14343]"
                }`}>
                  ● {task.status.toUpperCase()}
                </span>
                <span>•</span>
                <span>{fmtBytes(task.completedBytes)} / {fmtBytes(task.totalBytes)}</span>
                <span>•</span>
                <span>{pct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0 ml-4">
            {task.status === "completed" && (
              <button
                onClick={() => {
                  onAction("task.openFile", { id: task.id });
                  const targetFile = task.dir ? `${task.dir}/${task.filename}` : task.filename;
                  try {
                    (window as any).webkit?.messageHandlers?.downnux?.postMessage(`openFile:${targetFile}`);
                  } catch {}
                }}
                className="h-[30px] px-3 rounded-[6px] ios-button-primary text-white text-[11px] font-semibold flex items-center space-x-1.5 shadow-sm"
                title={lang === "en" ? "Open Downloaded File" : "Buka File Unduhan"}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{lang === "en" ? "Open File" : "Buka File"}</span>
              </button>
            )}

            {task.status === "downloading" ? (
              <button
                onClick={() => onAction("task.pause", { id: task.id })}
                className="h-[30px] px-2.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[11px] font-medium flex items-center space-x-1"
                title={lang === "en" ? "Pause Download" : "Jeda Unduhan"}
              >
                <Pause className="w-3.5 h-3.5 text-[#ac8433] dark:text-[#fbbf24]" />
                <span>{lang === "en" ? "Pause" : "Jeda"}</span>
              </button>
            ) : task.status === "paused" || task.status === "failed" ? (
              <button
                onClick={() => onAction("task.resume", { id: task.id })}
                className="h-[30px] px-2.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[11px] font-medium flex items-center space-x-1"
                title={lang === "en" ? "Resume Download" : "Lanjutkan Unduhan"}
              >
                <Play className="w-3.5 h-3.5 text-[#218163] dark:text-[#38d49a]" />
                <span>{lang === "en" ? "Resume" : "Lanjut"}</span>
              </button>
            ) : null}

            <button
              onClick={() => onAction("task.openFolder", { id: task.id })}
              className="h-[30px] px-2.5 rounded-[6px] ios-glass-button text-[#202631] dark:text-white text-[11px] font-medium flex items-center space-x-1"
              title={lang === "en" ? "Open Containing Folder" : "Buka Folder Lokasi"}
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#6554c0] dark:text-[#a79be8]" />
              <span>{lang === "en" ? "Folder" : "Folder"}</span>
            </button>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[6px] hover:bg-[#f7f8fa] dark:hover:bg-[#25283b] flex items-center justify-center text-[#6e7685] hover:text-[#202631] dark:hover:text-white ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Progres & Speed Metrics */}
        <div className="px-5 py-3.5 bg-[#f7f8fa]/60 dark:bg-[#12131b]/60 border-b border-[#e7e9ef] dark:border-[#2a2c3d] flex-shrink-0">
          {/* Main Progress Bar (Iconic IDM Style) */}
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
            <span className="text-[#6e7685] dark:text-[#9ea4b5] font-semibold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-[#6554c0] dark:text-[#a79be8]" />
              {lang === "en" ? "Download Progress" : "Progres Unduhan"}
            </span>
            <span className="font-bold text-[13px] text-[#202631] dark:text-white">{pct.toFixed(1)}%</span>
          </div>

          <div className="h-[24px] bg-[#e7e9ef] dark:bg-[#252838] rounded-[6px] overflow-hidden relative border border-[#d8dce6] dark:border-[#32364a] shadow-inner">
            <div
              className={`h-full transition-all duration-300 relative ${
                task.status === "completed"
                  ? "bg-[#218163] dark:bg-[#38d49a]"
                  : "bg-gradient-to-r from-[#6554c0] via-[#8b7ce0] to-[#38d49a]"
              }`}
              style={{ width: `${pct}%` }}
            >
              {task.status === "downloading" && (
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {pct.toFixed(1)}% {task.status === "completed" ? (lang === "en" ? "• Completed" : "• Selesai") : ""}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-[#e7e9ef]/60 dark:border-[#2a2c3d]/60 text-center">
            <div className="p-2 rounded-[8px] bg-white/70 dark:bg-[#1a1c29]/70 border border-[#e7e9ef] dark:border-[#2a2c3d]">
              <span className="text-[9px] font-semibold text-[#6e7685] dark:text-[#9ea4b5] uppercase block">
                {lang === "en" ? "CURRENT SPEED" : "KECEPATAN KINI"}
              </span>
              <span className="text-[15px] font-bold text-[#202631] dark:text-white mt-0.5 block">
                {task.status === "downloading" ? `${(task.speed / (1024 * 1024)).toFixed(1).replace(".", ",")} MB/s` : "0,0 MB/s"}
              </span>
            </div>

            <div className="p-2 rounded-[8px] bg-white/70 dark:bg-[#1a1c29]/70 border border-[#e7e9ef] dark:border-[#2a2c3d]">
              <span className="text-[9px] font-semibold text-[#6e7685] dark:text-[#9ea4b5] uppercase block">
                {lang === "en" ? "TIME REMAINING" : "SISA WAKTU"}
              </span>
              <span className="text-[15px] font-bold text-[#202631] dark:text-white mt-0.5 block">
                {fmtTime(etaSec, lang)}
              </span>
            </div>

            <div className="p-2 rounded-[8px] bg-white/70 dark:bg-[#1a1c29]/70 border border-[#e7e9ef] dark:border-[#2a2c3d]">
              <span className="text-[9px] font-semibold text-[#6e7685] dark:text-[#9ea4b5] uppercase block">
                {lang === "en" ? "CONNECTIONS" : "KONEKSI AKTIF"}
              </span>
              <span className="text-[15px] font-bold text-[#202631] dark:text-white mt-0.5 block">
                {task.activeConnections || 0} / {task.connections || 8}
              </span>
            </div>

            <div className="p-2 rounded-[8px] bg-white/70 dark:bg-[#1a1c29]/70 border border-[#e7e9ef] dark:border-[#2a2c3d]">
              <span className="text-[9px] font-semibold text-[#6e7685] dark:text-[#9ea4b5] uppercase block">
                {lang === "en" ? "PEAK SPEED" : "PUNCAK KECEPATAN"}
              </span>
              <span className="text-[15px] font-bold text-[#202631] dark:text-white mt-0.5 block">
                {(Math.max(...history, 0) / (1024 * 1024)).toFixed(1).replace(".", ",")} MB/s
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-[#e7e9ef] dark:border-[#2a2c3d] flex items-center space-x-2 bg-white/30 dark:bg-[#161826]/40 flex-shrink-0">
          <button
            onClick={() => setActiveTab("segments")}
            className={`pb-2.5 px-3 text-[11px] font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === "segments"
                ? "border-[#6554c0] text-[#6554c0] dark:text-[#a79be8]"
                : "border-transparent text-[#6e7685] dark:text-[#9ea4b5] hover:text-[#202631] dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "IDM Segment & Pieces Map" : "Peta Segmen & Potongan (IDM)"}</span>
          </button>

          <button
            onClick={() => setActiveTab("speed")}
            className={`pb-2.5 px-3 text-[11px] font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === "speed"
                ? "border-[#6554c0] text-[#6554c0] dark:text-[#a79be8]"
                : "border-transparent text-[#6e7685] dark:text-[#9ea4b5] hover:text-[#202631] dark:hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Real-Time Speed Chart" : "Grafik Kecepatan Real-Time"}</span>
          </button>

          {task.isTorrent && (
            <button
              onClick={() => setActiveTab("torrent")}
              className={`pb-2.5 px-3 text-[11px] font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${
                activeTab === "torrent"
                  ? "border-[#7c3aed] text-[#7c3aed] dark:text-[#c084fc]"
                  : "border-transparent text-[#6e7685] dark:text-[#9ea4b5] hover:text-[#202631] dark:hover:text-white"
              }`}
            >
              <Magnet className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>{lang === "en" ? "BitTorrent P2P Swarm" : "BitTorrent & Swarm P2P"}</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: IDM SEGMENT & PIECE MAP */}
          {activeTab === "segments" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2 font-medium">
                  <span className="text-[#202631] dark:text-white font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#6554c0] dark:text-[#a79be8]" />
                    {lang === "en" ? "Parallel Chunk Allocation Grid" : "Grid Alokasi Segmen Paralel"}
                  </span>
                  <span className="text-[10px] text-[#6e7685] dark:text-[#9ea4b5]">
                    {completedSegments} / {totalSegments} {lang === "en" ? "segments written" : "segmen tertulis"}
                  </span>
                </div>

                {/* Iconic 32 Micro-Segment Blocks (Classic IDM Visualizer) */}
                <div className="p-3.5 bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[10px]">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(16, minmax(0, 1fr))", gap: "5px" }}>
                    {Array.from({ length: totalSegments }).map((_, idx) => {
                      const isComplete = idx < completedSegments || task.status === "completed";
                      const isActive =
                        task.status === "downloading" &&
                        !isComplete &&
                        idx >= completedSegments &&
                        idx < completedSegments + Math.ceil(activeSegmentCount / 2);

                      return (
                        <div
                          key={idx}
                          className={`h-[18px] rounded-[3px] border transition-all duration-300 relative overflow-hidden ${
                            isComplete
                              ? "bg-gradient-to-t from-[#6554c0] to-[#8b7ce0] border-[#5a4ab0] shadow-xs"
                              : isActive
                              ? "bg-gradient-to-r from-[#218163] to-[#38d49a] border-[#1b6b52] animate-pulse"
                              : "bg-[#eceaf4] dark:bg-[#1f2233] border-[#dedbe9] dark:border-[#2b2e42]"
                          }`}
                          title={`Segment #${idx + 1}: ${isComplete ? "Completed" : isActive ? "Writing (Active)" : "Pending"}`}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-white/20 animate-stripes" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-3 text-[10px] text-[#6e7685] dark:text-[#9ea4b5] border-t border-[#e7e9ef] dark:border-[#2a2c3d] pt-2">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#6554c0] inline-block" />
                        {lang === "en" ? "Completed" : "Selesai"}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#38d49a] inline-block" />
                        {lang === "en" ? "Active Stream" : "Stream Aktif"}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#eceaf4] dark:bg-[#1f2233] border border-current inline-block" />
                        {lang === "en" ? "Pending" : "Menunggu"}
                      </span>
                    </div>
                    <span>{task.pieceLength ? `${fmtBytes(task.pieceLength)} / piece` : "Dynamic Split"}</span>
                  </div>
                </div>
              </div>

              {/* Active Threads Table */}
              <div>
                <h4 className="text-[11px] font-semibold text-[#202631] dark:text-white uppercase tracking-wider mb-2">
                  {lang === "en" ? "Active Connection Threads" : "Thread Koneksi Aktif"}
                </h4>
                <div className="border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[8px] overflow-hidden text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-[#f7f8fa] dark:bg-[#161826] text-[#6e7685] dark:text-[#9ea4b5] border-b border-[#e7e9ef] dark:border-[#2a2c3d]">
                      <tr>
                        <th className="py-2 px-3 font-semibold">{lang === "en" ? "Thread" : "Thread"}</th>
                        <th className="py-2 px-3 font-semibold">{lang === "en" ? "Status" : "Status"}</th>
                        <th className="py-2 px-3 font-semibold">{lang === "en" ? "Allocated Chunk" : "Alokasi Chunk"}</th>
                        <th className="py-2 px-3 font-semibold text-right">{lang === "en" ? "Estimated Speed" : "Estimasi Speed"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e7e9ef] dark:divide-[#2a2c3d]">
                      {Array.from({ length: task.connections || 8 }).map((_, idx) => {
                        const isThreadActive = task.status === "downloading" && idx < (task.activeConnections || 1);
                        const isDone = task.status === "completed";
                        const threadSpeed = isThreadActive ? (task.speed / (task.activeConnections || 1)) : 0;

                        return (
                          <tr key={idx} className="hover:bg-white/40 dark:hover:bg-[#1a1c29]/50">
                            <td className="py-2 px-3 font-mono font-bold text-[#6554c0] dark:text-[#a79be8]">
                              #{String(idx + 1).padStart(2, "0")}
                            </td>
                            <td className="py-2 px-3">
                              {isDone ? (
                                <span className="text-[#218163] dark:text-[#38d49a] font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> {lang === "en" ? "Completed" : "Selesai"}
                                </span>
                              ) : isThreadActive ? (
                                <span className="text-[#218163] dark:text-[#38d49a] font-medium flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-[#38d49a] animate-ping" />
                                  {lang === "en" ? "Receiving Data" : "Menerima Data"}
                                </span>
                              ) : (
                                <span className="text-[#6e7685] dark:text-[#9ea4b5]">
                                  {lang === "en" ? "Idle / Standby" : "Siaga"}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] text-[#6e7685] dark:text-[#9ea4b5]">
                              {task.totalBytes > 0
                                ? `${fmtBytes((task.totalBytes / (task.connections || 8)) * idx)} - ${fmtBytes(
                                    (task.totalBytes / (task.connections || 8)) * (idx + 1)
                                  )}`
                                : "Dynamic Range"}
                            </td>
                            <td className="py-2 px-3 font-mono text-right font-medium text-[#202631] dark:text-white">
                              {threadSpeed > 0 ? `${(threadSpeed / 1024).toFixed(1).replace(".", ",")} KB/s` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REAL-TIME SPEED CHART */}
          {activeTab === "speed" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-semibold text-[#202631] dark:text-white">
                    {lang === "en" ? "Bandwidth Throughput History" : "Riwayat Kecepatan Bandwidth"}
                  </h3>
                  <p className="text-[10px] text-[#6e7685] dark:text-[#9ea4b5] mt-0.5">
                    {lang === "en"
                      ? "Visualizing live throughput over the last 40 seconds"
                      : "Visualisasi fluktuasi kecepatan transfer selama 40 detik terakhir"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wide text-[#6e7685] dark:text-[#9ea4b5] block">
                    {lang === "en" ? "Average" : "Rata-rata"}
                  </span>
                  <span className="text-[13px] font-bold text-[#6554c0] dark:text-[#a79be8]">
                    {(avgSpeed / (1024 * 1024)).toFixed(1).replace(".", ",")} MB/s
                  </span>
                </div>
              </div>

              {/* Dynamic SVG Waveform Chart */}
              <div className="p-4 bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[10px] relative">
                <div className="w-full h-[140px] relative">
                  <svg
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 540 140"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="liveSpeedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6554C0" stopOpacity="0.45" />
                        <stop offset="70%" stopColor="#8b7ce0" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#8b7ce0" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    <line x1="0" y1="35" x2="540" y2="35" stroke="currentColor" strokeDasharray="4 4" className="text-[#e7e9ef] dark:text-[#2a2c3d]" />
                    <line x1="0" y1="70" x2="540" y2="70" stroke="currentColor" strokeDasharray="4 4" className="text-[#e7e9ef] dark:text-[#2a2c3d]" />
                    <line x1="0" y1="105" x2="540" y2="105" stroke="currentColor" strokeDasharray="4 4" className="text-[#e7e9ef] dark:text-[#2a2c3d]" />

                    {/* Area fill */}
                    <path d={areaD} fill="url(#liveSpeedGrad)" />

                    {/* Waveform line */}
                    <path d={pathD} strokeWidth="2.5" stroke="#6554C0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#6e7685] dark:text-[#9ea4b5] mt-2 pt-2 border-t border-[#e7e9ef] dark:border-[#2a2c3d]">
                  <span>{lang === "en" ? "40s ago" : "40 d lalu"}</span>
                  <span>{lang === "en" ? "Current Speed:" : "Kecepatan Kini:"} {fmtBytes(task.speed)}/s</span>
                  <span>{lang === "en" ? "Now" : "Sekarang"}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BITTORRENT SWARM DETAILS */}
          {activeTab === "torrent" && task.isTorrent && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-[#7c3aed]/10 via-[#a855f7]/5 to-transparent border border-[#7c3aed]/25 rounded-[10px] flex items-center space-x-3">
                <Magnet className="w-5 h-5 text-[#a855f7] flex-shrink-0" />
                <div>
                  <h4 className="text-[12px] font-semibold text-[#202631] dark:text-white">
                    {lang === "en" ? "BitTorrent Distributed Swarm" : "Jaringan Terdistribusi BitTorrent"}
                  </h4>
                  <p className="text-[10px] text-[#6e7685] dark:text-[#9ea4b5]">
                    {lang === "en"
                      ? "P2P segmented transfer via DHT, PEX, and decentralized peer swarms."
                      : "Transfer segmen P2P melalui jaringan desentralisasi DHT, PEX, dan peer tracker."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-[8px] bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d]">
                  <span className="text-[10px] font-medium text-[#6e7685] dark:text-[#9ea4b5] flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-[#38d49a]" /> {lang === "en" ? "Seeders / Peers" : "Seeder & Peer"}
                  </span>
                  <span className="text-[16px] font-bold text-[#202631] dark:text-white mt-1 block">
                    {task.numSeeders || 0} {lang === "en" ? "seeders" : "seeder"} · {task.activeConnections || 0} {lang === "en" ? "connected" : "terhubung"}
                  </span>
                </div>

                <div className="p-3 rounded-[8px] bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d]">
                  <span className="text-[10px] font-medium text-[#6e7685] dark:text-[#9ea4b5] flex items-center gap-1">
                    <ArrowUp className="w-3.5 h-3.5 text-[#a855f7]" /> {lang === "en" ? "Upload Rate" : "Kecepatan Upload"}
                  </span>
                  <span className="text-[16px] font-bold text-[#202631] dark:text-white mt-1 block">
                    {fmtBytes(task.uploadSpeed || 0)}/s
                  </span>
                </div>

                <div className="p-3 rounded-[8px] bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d]">
                  <span className="text-[10px] font-medium text-[#6e7685] dark:text-[#9ea4b5]">
                    {lang === "en" ? "Total Uploaded" : "Total Ter-upload"}
                  </span>
                  <span className="text-[14px] font-bold text-[#202631] dark:text-white mt-1 block font-mono">
                    {fmtBytes(task.uploadBytes || 0)}
                  </span>
                </div>

                <div className="p-3 rounded-[8px] bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d]">
                  <span className="text-[10px] font-medium text-[#6e7685] dark:text-[#9ea4b5]">
                    {lang === "en" ? "Torrent Pieces" : "Potongan Piece"}
                  </span>
                  <span className="text-[14px] font-bold text-[#202631] dark:text-white mt-1 block font-mono">
                    {task.numPieces ? `${task.numPieces} pcs (${fmtBytes(task.pieceLength || 0)} ea)` : "Analyzing metadata..."}
                  </span>
                </div>
              </div>

              {/* Bitfield Hash Representation */}
              {task.bitfield && (
                <div>
                  <span className="text-[10px] font-semibold text-[#6e7685] dark:text-[#9ea4b5] uppercase block mb-1.5">
                    {lang === "en" ? "Piece Bitfield Verification" : "Verifikasi Bitfield Potongan"}
                  </span>
                  <div className="p-2.5 bg-[#f7f8fa] dark:bg-[#12131b] border border-[#e7e9ef] dark:border-[#2a2c3d] rounded-[6px] font-mono text-[9px] text-[#6554c0] dark:text-[#a79be8] break-all leading-tight max-h-[60px] overflow-y-auto">
                    {task.bitfield}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e7e9ef] dark:border-[#2a2c3d] bg-white/40 dark:bg-[#151724]/60 flex items-center justify-between text-[11px] flex-shrink-0">
          <span className="text-[#6e7685] dark:text-[#9ea4b5] truncate max-w-sm">
            {lang === "en" ? "Location:" : "Lokasi:"} {task.dir || "~/Downloads"}
          </span>
          <button
            onClick={onClose}
            className="h-[32px] px-4 rounded-[6px] bg-[#6554c0] hover:bg-[#5a4ab0] text-white font-medium"
          >
            {lang === "en" ? "Close Inspector" : "Tutup"}
          </button>
        </div>
      </div>
    </div>
  );
}
