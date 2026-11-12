import { useState } from "react";
import {
  Clock,
  Play,
  Power,
  Check,
  Layers,
} from "lucide-react";
import { translations, type Lang } from "../i18n";
import type { Task } from "../App";

export interface ScheduleConfigData {
  enabled: boolean;
  mode: "once" | "recurring";
  startTime: string;
  stopTime: string | null;
  daysOfWeek: number[];
  maxSimultaneous: number;
  onFinishAction: "none" | "quit" | "sleep" | "shutdown";
}

interface SchedulerViewProps {
  lang: Lang;
  config: ScheduleConfigData;
  tasks: Task[];
  onSave: (next: ScheduleConfigData) => void;
  onRunNow: () => void;
  onResumeTask: (id: string) => void;
}

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function SchedulerView({
  lang,
  config: initialConfig,
  tasks,
  onSave,
  onRunNow,
  onResumeTask,
}: SchedulerViewProps) {
  const t = translations[lang];
  const [config, setConfig] = useState<ScheduleConfigData>({ ...initialConfig });
  const [savedToast, setSavedToast] = useState(false);

  const pendingTasks = tasks.filter(
    (task) => task.status === "queued" || task.status === "paused"
  );

  const toggleDay = (dayIdx: number) => {
    let nextDays = [...config.daysOfWeek];
    if (nextDays.includes(dayIdx)) {
      if (nextDays.length > 1) {
        nextDays = nextDays.filter((d) => d !== dayIdx);
      }
    } else {
      nextDays = [...nextDays, dayIdx].sort((a, b) => a - b);
    }
    setConfig({ ...config, daysOfWeek: nextDays });
  };

  const handleSave = () => {
    onSave(config);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2400);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f7f8fa] dark:bg-[#12131a] select-none">
      {/* Header */}
      <div className="h-[52px] border-b border-[#e7e9ef] dark:border-[#2a2c3d] px-6 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-[#181926]/70 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#6554c0]" />
          <h2 className="text-[14px] font-bold text-[#202631] dark:text-white">
            {t.schedulerTitle}
          </h2>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
              config.enabled
                ? "bg-[#eef4f1] text-[#218163] dark:bg-[#218163]/20 dark:text-[#38d49a]"
                : "bg-[#e7e9ef] text-[#6e7685] dark:bg-[#25283b] dark:text-[#8f96a8]"
            }`}
          >
            {config.enabled ? "Active" : "Disabled"}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {savedToast && (
            <span className="text-[11px] font-medium text-[#218163] dark:text-[#38d49a] flex items-center gap-1 animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              {lang === "en" ? "Schedule saved!" : "Jadwal tersimpan!"}
            </span>
          )}
          <button
            onClick={onRunNow}
            className="px-3 py-1.5 rounded-[6px] ios-glass-button text-[12px] font-medium flex items-center space-x-1.5 text-[#202631] dark:text-white"
            title="Start processing queued downloads immediately"
          >
            <Play className="w-3 h-3 text-[#6554c0] fill-[#6554c0]" />
            <span>{t.startQueueNow}</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-[6px] ios-button-primary text-[12px] font-medium shadow-sm flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-3xl space-y-5">
          {/* Status & Master Switch Banner */}
          <div className="p-4 bg-white dark:bg-[#1a1c29] rounded-[8px] border border-[#e7e9ef] dark:border-[#2a2d40] shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  config.enabled
                    ? "bg-[#edeaf9] dark:bg-[#6554c0]/20 text-[#6554c0]"
                    : "bg-[#f7f8fa] dark:bg-[#25283b] text-[#6e7685]"
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-[#202631] dark:text-white">
                  {t.enableScheduler}
                </h3>
                <p className="text-[11px] text-[#6e7685] dark:text-[#8f96a8]">
                  {config.enabled ? t.schedulerActiveNow : t.schedulerInactive}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#e7e9ef] dark:bg-[#2a2d40] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6554c0]"></div>
            </label>
          </div>

          {/* Time Window Card */}
          <div className="p-5 bg-white dark:bg-[#1a1c29] rounded-[8px] border border-[#e7e9ef] dark:border-[#2a2d40] space-y-4">
            <div className="flex items-center justify-between border-b border-[#e7e9ef] dark:border-[#2a2d40] pb-3">
              <div>
                <h4 className="text-[12px] font-bold text-[#202631] dark:text-white">
                  {t.timeWindow}
                </h4>
                <p className="text-[10px] text-[#6e7685] dark:text-[#8f96a8]">
                  {lang === "en"
                    ? "Set the time range when downloads are allowed to run automatically."
                    : "Tentukan rentang jam saat proses unduhan diizinkan berjalan otomatis."}
                </p>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, mode: "recurring" })}
                  className={`px-3 py-1 rounded-[5px] text-[11px] font-medium border transition-colors ${
                    config.mode === "recurring"
                      ? "bg-[#6554c0] text-white border-[#5a4ab0]"
                      : "bg-[#f7f8fa] dark:bg-[#25283b] text-[#202631] dark:text-white border-[#e7e9ef] dark:border-[#2a2d40]"
                  }`}
                >
                  {t.recurringDaily}
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, mode: "once" })}
                  className={`px-3 py-1 rounded-[5px] text-[11px] font-medium border transition-colors ${
                    config.mode === "once"
                      ? "bg-[#6554c0] text-white border-[#5a4ab0]"
                      : "bg-[#f7f8fa] dark:bg-[#25283b] text-[#202631] dark:text-white border-[#e7e9ef] dark:border-[#2a2d40]"
                  }`}
                >
                  {t.oneTime}
                </button>
              </div>
            </div>

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6e7685] dark:text-[#9ea4b5]">
                  {t.startTime} (HH:MM):
                </label>
                <input
                  type="time"
                  value={config.startTime}
                  onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                  className="w-full bg-[#f7f8fa] dark:bg-[#12131a] border border-[#e7e9ef] dark:border-[#2a2d40] rounded-[6px] px-3 py-2 text-[14px] font-bold text-[#202631] dark:text-white text-center focus:outline-none focus:border-[#6554c0]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#6e7685] dark:text-[#9ea4b5]">
                  {t.stopTime} (HH:MM):
                </label>
                <input
                  type="time"
                  value={config.stopTime || "06:00"}
                  onChange={(e) => setConfig({ ...config, stopTime: e.target.value || null })}
                  className="w-full bg-[#f7f8fa] dark:bg-[#12131a] border border-[#e7e9ef] dark:border-[#2a2d40] rounded-[6px] px-3 py-2 text-[14px] font-bold text-[#202631] dark:text-white text-center focus:outline-none focus:border-[#6554c0]"
                />
              </div>
            </div>

            {/* Days of week */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-[#6e7685] dark:text-[#9ea4b5] mb-2">
                {t.daysActive}:
              </label>
              <div className="flex items-center space-x-2">
                {(lang === "en" ? DAYS_SHORT : DAYS_SHORT_ID).map((dayName, idx) => {
                  const isDayActive = config.daysOfWeek.includes(idx);
                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`w-10 h-8 rounded-[6px] text-[11px] font-bold border transition-colors ${
                        isDayActive
                          ? "bg-[#6554c0] text-white border-[#5a4ab0] shadow-xs"
                          : "bg-[#f7f8fa] dark:bg-[#25283b] text-[#6e7685] dark:text-[#8f96a8] border-[#e7e9ef] dark:border-[#2a2d40]"
                      }`}
                    >
                      {dayName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Queue Policy & Power Action */}
          <div className="grid grid-cols-2 gap-4">
            {/* Queue Execution Policy */}
            <div className="p-4 bg-white dark:bg-[#1a1c29] rounded-[8px] border border-[#e7e9ef] dark:border-[#2a2d40] space-y-3">
              <h4 className="text-[12px] font-bold text-[#202631] dark:text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#6554c0]" />
                {t.queuePolicy}
              </h4>
              <div className="space-y-2">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="queueSimultaneous"
                    checked={config.maxSimultaneous === 1}
                    onChange={() => setConfig({ ...config, maxSimultaneous: 1 })}
                    className="mt-0.5 accent-[#6554c0]"
                  />
                  <div>
                    <span className="text-[11px] font-semibold text-[#202631] dark:text-white block">
                      {lang === "en" ? "Sequential (1 by 1)" : "Berurutan (1 per 1)"}
                    </span>
                    <span className="text-[10px] text-[#6e7685] dark:text-[#8f96a8]">
                      {lang === "en" ? "Full bandwidth per file" : "Kecepatan maksimal per file"}
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="queueSimultaneous"
                    checked={config.maxSimultaneous > 1}
                    onChange={() => setConfig({ ...config, maxSimultaneous: 3 })}
                    className="mt-0.5 accent-[#6554c0]"
                  />
                  <div>
                    <span className="text-[11px] font-semibold text-[#202631] dark:text-white block">
                      {lang === "en" ? "Parallel (Up to 3 active)" : "Paralel (Hingga 3 bersamaan)"}
                    </span>
                    <span className="text-[10px] text-[#6e7685] dark:text-[#8f96a8]">
                      {lang === "en" ? "Download multiple files at once" : "Download banyak file sekaligus"}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Post Completion Action */}
            <div className="p-4 bg-white dark:bg-[#1a1c29] rounded-[8px] border border-[#e7e9ef] dark:border-[#2a2d40] space-y-3">
              <h4 className="text-[12px] font-bold text-[#202631] dark:text-white flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-[#6554c0]" />
                {t.onFinishAction}
              </h4>
              <div className="space-y-1.5">
                {[
                  { id: "none", label: t.actionNone },
                  { id: "sleep", label: t.actionSleepPC },
                  { id: "shutdown", label: t.actionShutdownPC },
                  { id: "quit", label: t.actionQuitApp },
                ].map((act) => (
                  <label key={act.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="onFinishAction"
                      checked={config.onFinishAction === act.id}
                      onChange={() => setConfig({ ...config, onFinishAction: act.id as any })}
                      className="accent-[#6554c0]"
                    />
                    <span className="text-[11px] text-[#202631] dark:text-white">{act.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Current Scheduled Queue Card */}
          <div className="p-5 bg-white dark:bg-[#1a1c29] rounded-[8px] border border-[#e7e9ef] dark:border-[#2a2d40] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[12px] font-bold text-[#202631] dark:text-white">
                  {lang === "en" ? "Scheduled Queue Items" : "Daftar Antrean Terjadwal"} (
                  {pendingTasks.length})
                </h4>
                <p className="text-[10px] text-[#6e7685] dark:text-[#8f96a8]">
                  {lang === "en"
                    ? "Paused and queued downloads waiting for scheduled window."
                    : "Unduhan dijeda dan dalam antrean yang menunggu jadwal aktif."}
                </p>
              </div>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="py-8 text-center text-[#6e7685] dark:text-[#8f96a8] text-[11px] bg-[#f7f8fa] dark:bg-[#12131a] rounded-[6px]">
                {lang === "en"
                  ? "No downloads waiting in queue. Add URLs and choose 'Download Later' to schedule."
                  : "Tidak ada unduhan dalam antrean. Tambahkan URL lalu pilih 'Unduh Nanti' untuk menjadwalkan."}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {pendingTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-[6px] bg-[#f7f8fa] dark:bg-[#12131a] border border-[#e7e9ef] dark:border-[#2a2d40] flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <span className="w-5 h-5 rounded-full bg-[#edeaf9] dark:bg-[#6554c0]/20 text-[#6554c0] dark:text-[#a79be8] font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-[#202631] dark:text-white truncate max-w-sm">
                        {task.filename || task.url}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-[#6e7685] bg-white dark:bg-[#1a1c29] px-2 py-0.5 rounded border border-[#e7e9ef] dark:border-[#2a2d40]">
                        {task.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => onResumeTask(task.id)}
                        className="px-2 py-1 rounded bg-[#6554c0] text-white text-[10px] font-semibold"
                      >
                        {lang === "en" ? "Start" : "Mulai"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
