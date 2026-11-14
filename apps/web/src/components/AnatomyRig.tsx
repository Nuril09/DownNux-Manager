import React, { useState, useEffect, useRef } from "react";
import { createInitialModel, calculateSpeed, ConnectionCount, RigModel, RigState } from "./rig-model";

interface AnatomyRigProps {
  theme: "dark" | "light";
  lang: "en" | "id";
}

export function AnatomyRig({ theme, lang }: AnatomyRigProps) {
  const [model, setModel] = useState<RigModel>(createInitialModel);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Interactive controls
  const handleSetConnections = (conns: ConnectionCount) => {
    setModel((prev) => ({
      ...prev,
      connections: conns,
      speedMbps: calculateSpeed(conns, prev.state),
    }));
  };

  const handleStartOrResume = () => {
    setModel((prev) => {
      const nextState: RigState = prev.state === "completed" ? "downloading" : "downloading";
      const reset = prev.state === "completed" || prev.progressPercent >= 100;
      return {
        ...prev,
        state: nextState,
        speedMbps: calculateSpeed(prev.connections, nextState),
        progressPercent: reset ? 0 : prev.progressPercent,
        transferredMb: reset ? 0 : prev.transferredMb,
        segments: reset ? new Array(32).fill(0) : prev.segments,
      };
    });
  };

  const handleSimulateCrash = () => {
    setModel((prev) => ({
      ...prev,
      state: "interrupted",
      speedMbps: 0,
      dialAngleDeg: -120,
    }));
  };

  const handleRecoverWal = () => {
    setModel((prev) => ({
      ...prev,
      state: "recovering",
      speedMbps: calculateSpeed(prev.connections, "recovering"),
      walCommitCount: prev.walCommitCount + 1,
    }));
    setTimeout(() => {
      setModel((prev) => ({
        ...prev,
        state: "downloading",
        speedMbps: calculateSpeed(prev.connections, "downloading"),
      }));
    }, 1200);
  };

  const handleReset = () => {
    setModel(createInitialModel());
  };

  // Animation Loop updating segments and progress realistically
  useEffect(() => {
    const tick = (now: number) => {
      const deltaSec = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      setModel((prev) => {
        if (prev.state !== "downloading" && prev.state !== "recovering") {
          return prev;
        }

        const addedMb = prev.speedMbps * deltaSec * 3; // Accelerated simulation
        const newTransferred = Math.min(prev.transferredMb + addedMb, prev.totalMb);
        const newProgress = (newTransferred / prev.totalMb) * 100;

        // Distribute progress across active connections into 32 segments
        const activeSegmentsCount = Math.min(prev.connections, 32);
        const newSegments = [...prev.segments];
        const overallRatio = newProgress / 100;

        for (let i = 0; i < 32; i++) {
          if (i < activeSegmentsCount) {
            // Fill active channels in parallel
            const target = Math.min(1, overallRatio * (32 / activeSegmentsCount) + (i % 3) * 0.05);
            newSegments[i] = Math.min(1, Math.max(newSegments[i], target));
          } else {
            // Standby channels wait their turn
            newSegments[i] = Math.min(1, Math.max(newSegments[i], overallRatio));
          }
        }

        const isFinished = newProgress >= 100;
        const targetDial = isFinished ? -120 : -120 + (prev.speedMbps / 50) * 240;

        return {
          ...prev,
          transferredMb: newTransferred,
          progressPercent: newProgress,
          state: isFinished ? "completed" : prev.state,
          speedMbps: isFinished ? 0 : prev.speedMbps,
          dialAngleDeg: targetDial,
          walCommitCount: prev.walCommitCount + (Math.random() < 0.05 ? 1 : 0),
          segments: newSegments,
        };
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Carriage horizontal position based on active progress
  const carriageX = 140 + (model.progressPercent / 100) * 260;

  return (
    <div
      className="iso rounded-[12px] border transition-colors overflow-hidden relative shadow-2xl"
      data-theme={theme === "light" ? "light" : undefined}
      style={{
        backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.94)" : "rgba(18, 20, 36, 0.92)",
        borderColor: theme === "light" ? "#dfe3f0" : "rgba(139, 92, 246, 0.28)",
      }}
    >
      {/* Anatomy Framed Card Header */}
      <div className="px-5 py-3 border-b flex items-center justify-between font-mono text-[11px]"
        style={{ borderColor: theme === "light" ? "#eaedf5" : "rgba(139, 92, 246, 0.16)" }}
      >
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[#6554c0] dark:text-[#a79be8]">Fig 1.</span>
          <span className="text-[#3b4154] dark:text-[#c4cbde]">32-CHANNEL RANGE DISTRIBUTOR & WAL VAULT</span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              model.state === "downloading"
                ? "bg-[#2dd4bf] animate-pulse"
                : model.state === "interrupted"
                ? "bg-rose-500"
                : model.state === "completed"
                ? "bg-emerald-500"
                : "bg-slate-400"
            }`}
          />
          <span className="uppercase text-[10px] tracking-wider text-[#636c84] dark:text-[#9ea4b8]">
            {model.state}
          </span>
        </div>
      </div>

      {/* Isometric Canvas */}
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 680 340"
          className="w-full max-w-[680px] h-auto select-none"
          role="img"
          aria-label="Interactive isometric technical illustration of DownNux 32-channel range download distributor and SQLite WAL recovery engine"
        >
          <defs>
            {/* Soft ground shadow */}
            <radialGradient id="rigShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity={theme === "light" ? "0.15" : "0.55"} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            {/* Metallic cylinder gradients */}
            <linearGradient id="railGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme === "light" ? "#f0f2f8" : "#383d58"} />
              <stop offset="50%" stopColor={theme === "light" ? "#cbd2e4" : "#1a1d2e"} />
              <stop offset="100%" stopColor={theme === "light" ? "#9aa4be" : "#10121e"} />
            </linearGradient>
          </defs>

          {/* Ground drop shadow */}
          <ellipse cx="340" cy="275" rx="280" ry="42" fill="url(#rigShadow)" />

          {/* 1. Base Plate & Feet (Base Tone) */}
          <g className="iso-solid" data-tone="lo">
            {/* Rubber Feet */}
            <ellipse cx="100" cy="265" rx="14" ry="7" fill={theme === "light" ? "#64748b" : "#111322"} />
            <ellipse cx="580" cy="265" rx="14" ry="7" fill={theme === "light" ? "#64748b" : "#111322"} />
            <ellipse cx="200" cy="290" rx="14" ry="7" fill={theme === "light" ? "#64748b" : "#111322"} />
            <ellipse cx="480" cy="290" rx="14" ry="7" fill={theme === "light" ? "#64748b" : "#111322"} />

            {/* Cast-iron Heavy Base Slab */}
            {/* Bottom face */}
            <path
              d="M 80 230 L 260 285 L 600 230 L 420 175 Z"
              fill={theme === "light" ? "#e4e8f2" : "#151829"}
              stroke={theme === "light" ? "#c7cfdf" : "#2a2e47"}
              strokeWidth="1.2"
            />
            {/* Side extrusion */}
            <path
              d="M 80 230 L 80 248 L 260 303 L 260 285 Z"
              fill={theme === "light" ? "#cdd4e4" : "#101220"}
            />
            <path
              d="M 260 285 L 260 303 L 600 248 L 600 230 Z"
              fill={theme === "light" ? "#b8c1d6" : "#0d0e19"}
            />

            {/* Corner Precision Dots (Fastener Screws) */}
            <circle cx="102" cy="232" r="2" fill={theme === "light" ? "#7e8b9f" : "#4e5677"} />
            <circle cx="260" cy="281" r="2" fill={theme === "light" ? "#7e8b9f" : "#4e5677"} />
            <circle cx="578" cy="232" r="2" fill={theme === "light" ? "#7e8b9f" : "#4e5677"} />
            <circle cx="420" cy="183" r="2" fill={theme === "light" ? "#7e8b9f" : "#4e5677"} />

            {/* Engraved Base Label Plate */}
            <polygon
              points="150,248 210,266 210,272 150,254"
              fill={theme === "light" ? "#f8fafc" : "#1d2138"}
              stroke={theme === "light" ? "#94a3b8" : "#434a6e"}
              strokeWidth="0.8"
            />
            <text
              x="154"
              y="262"
              fill={theme === "light" ? "#475569" : "#9ca8cc"}
              fontSize="6"
              fontFamily="monospace"
              fontWeight="bold"
              transform="skewY(16)"
            >
              DOWNNUX 32CH
            </text>
          </g>

          {/* 2. Stainless Steel Dual Guide Rails */}
          <g>
            <rect x="120" y="152" width="400" height="7" rx="3.5" fill="url(#railGrad)" stroke={theme === "light" ? "#94a3b8" : "#3b4263"} strokeWidth="0.8" />
            <rect x="120" y="165" width="400" height="7" rx="3.5" fill="url(#railGrad)" stroke={theme === "light" ? "#94a3b8" : "#3b4263"} strokeWidth="0.8" />
            {/* Ruler Ticks along the lower rail */}
            {[...Array(21)].map((_, i) => (
              <line
                key={i}
                x1={130 + i * 19}
                y1="172"
                x2={130 + i * 19}
                y2={i % 5 === 0 ? "177" : "174"}
                stroke={theme === "light" ? "#64748b" : "#606b91"}
                strokeWidth={i % 5 === 0 ? "1.2" : "0.8"}
              />
            ))}
          </g>

          {/* 3. 32-Segment Chunk Bank (Physical Rack with 32 visual bays) */}
          <g id="segment-bank">
            {model.segments.map((val, idx) => {
              // 4 rows of 8 segments
              const col = idx % 8;
              const row = Math.floor(idx / 8);
              const x = 160 + col * 34 + row * 12;
              const y = 188 + row * 16 - col * 4;

              const isFilled = val >= 1;
              const isWorking = val > 0 && val < 1 && (model.state === "downloading" || model.state === "recovering");

              return (
                <g key={idx} className="transition-all duration-150">
                  {/* Segment socket base */}
                  <polygon
                    points={`${x},${y} ${x + 24},${y - 6} ${x + 28},${y - 2} ${x + 4},${y + 4}`}
                    fill={
                      isFilled
                        ? "#22c55e"
                        : isWorking
                        ? "#2dd4bf"
                        : theme === "light"
                        ? "#d6dce9"
                        : "#1c1f33"
                    }
                    stroke={
                      isFilled
                        ? "#16a34a"
                        : isWorking
                        ? "#14b8a6"
                        : theme === "light"
                        ? "#b5bfd5"
                        : "#2a2f4d"
                    }
                    strokeWidth="0.8"
                  />
                  {/* Vertical extrusion if segment has byte data */}
                  {val > 0 && (
                    <polygon
                      points={`${x},${y} ${x},${y - val * 9} ${x + 4},${y + 4 - val * 9} ${x + 4},${y + 4}`}
                      fill={isFilled ? "#15803d" : "#0f766e"}
                    />
                  )}
                  {val > 0 && (
                    <polygon
                      points={`${x + 4},${y + 4} ${x + 4},${y + 4 - val * 9} ${x + 28},${y - 2 - val * 9} ${x + 28},${y - 2}`}
                      fill={isFilled ? "#16a34a" : "#14b8a6"}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* 4. Sliding Range Distribution Carriage */}
          <g transform={`translate(${carriageX - 240}, 0)`}>
            {/* Top Carriage Housing */}
            <polygon
              points="220,138 260,138 275,152 235,152"
              fill={theme === "light" ? "#6554c0" : "#5b4ab3"}
              stroke="#8b5cf6"
              strokeWidth="1"
            />
            <polygon
              points="220,138 220,158 235,172 235,152"
              fill={theme === "light" ? "#4a3c99" : "#3e3280"}
            />
            <polygon
              points="235,152 235,172 275,172 275,152"
              fill={theme === "light" ? "#5444a8" : "#483b92"}
              stroke="#8b5cf6"
              strokeWidth="0.8"
            />
            {/* Sliding Bushing Rings */}
            <circle cx="235" cy="155" r="4.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
            <circle cx="235" cy="168" r="4.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
            {/* Downward Range Dispenser Probe */}
            <line x1="255" y1="172" x2="255" y2="188" stroke="#2dd4bf" strokeWidth="2.5" strokeDasharray="3 2" />
          </g>

          {/* 5. SQLite WAL Vault Drum (Left Side) */}
          <g id="wal-vault">
            {/* Vault Cylinder Body */}
            <path
              d="M 90 170 C 90 156, 130 156, 130 170 L 130 205 C 130 219, 90 219, 90 205 Z"
              fill={theme === "light" ? "#e2e8f0" : "#1a1e32"}
              stroke={theme === "light" ? "#94a3b8" : "#3e466d"}
              strokeWidth="1.2"
            />
            {/* Vault Lid */}
            <ellipse cx="110" cy="170" rx="20" ry="7" fill={theme === "light" ? "#cbd5e1" : "#2a304e"} stroke={theme === "light" ? "#64748b" : "#55608c"} strokeWidth="1" />
            {/* WAL Status Gear / Indicator */}
            <circle cx="110" cy="190" r="6" fill={model.state === "interrupted" ? "#f43f5e" : "#22c55e"} />
            <text x="96" y="222" fontSize="7" fontFamily="monospace" fontWeight="bold" fill={theme === "light" ? "#475569" : "#9ea8cb"}>
              WAL #{model.walCommitCount}
            </text>
          </g>

          {/* 6. Precision Analog Dial Gauge (Throughput Meter - Right Side) */}
          <g id="throughput-dial">
            {/* Dial Support Post */}
            <rect x="548" y="150" width="8" height="60" fill={theme === "light" ? "#94a3b8" : "#2b304c"} />
            {/* Dial Face Bezel */}
            <circle cx="552" cy="120" r="34" fill={theme === "light" ? "#f8fafc" : "#141727"} stroke={theme === "light" ? "#6554c0" : "#8b5cf6"} strokeWidth="2.5" />
            <circle cx="552" cy="120" r="30" fill={theme === "light" ? "#ffffff" : "#0f111e"} stroke={theme === "light" ? "#cbd5e1" : "#282c44"} strokeWidth="1" />

            {/* Radial Ticks */}
            {[...Array(9)].map((_, i) => {
              const angle = -120 + i * 30;
              const rad = (angle * Math.PI) / 180;
              const x1 = 552 + Math.cos(rad) * 23;
              const y1 = 120 + Math.sin(rad) * 23;
              const x2 = 552 + Math.cos(rad) * 28;
              const y2 = 120 + Math.sin(rad) * 28;
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme === "light" ? "#475569" : "#8390b6"} strokeWidth={i % 2 === 0 ? "1.5" : "0.8"} />
              );
            })}

            {/* Center Axis Dot */}
            <circle cx="552" cy="120" r="2.5" fill="#8b5cf6" />

            {/* Needle (The Lit Accent) */}
            <g transform={`rotate(${model.dialAngleDeg}, 552, 120)`}>
              <line x1="552" y1="120" x2="552" y2="94" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
            </g>

            {/* Speed Readout in Dial Face */}
            <text x="552" y="138" textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="bold" fill={theme === "light" ? "#1e293b" : "#e2e8f0"}>
              {model.speedMbps.toFixed(1)} MB/s
            </text>
            <text x="552" y="145" textAnchor="middle" fontSize="5" fontFamily="sans-serif" fill={theme === "light" ? "#64748b" : "#94a3b8"}>
              RATE
            </text>
          </g>
        </svg>

        {/* Live Model Telemetry Bar (Inside the Card) */}
        <div className="w-full mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono text-[11px]"
          style={{ borderColor: theme === "light" ? "#eaedf5" : "rgba(139, 92, 246, 0.16)" }}
        >
          <div>
            <div className="text-[10px] text-[#6b7280] dark:text-[#9ea4b5] uppercase">
              {lang === "en" ? "Progress" : "Progres"}
            </div>
            <div className="font-bold text-[#111827] dark:text-[#f3f4f6]">
              {model.progressPercent.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#6b7280] dark:text-[#9ea4b5] uppercase">
              {lang === "en" ? "Transfer Rate" : "Kecepatan"}
            </div>
            <div className="font-bold text-[#6554c0] dark:text-[#a79be8]">
              {model.speedMbps.toFixed(1)} MB/s
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#6b7280] dark:text-[#9ea4b5] uppercase">
              {lang === "en" ? "Payload Size" : "Ukuran Data"}
            </div>
            <div className="font-bold text-[#111827] dark:text-[#f3f4f6]">
              {model.transferredMb.toFixed(0)} / {model.totalMb} MB
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#6b7280] dark:text-[#9ea4b5] uppercase">
              {lang === "en" ? "WAL Commits" : "Komit WAL"}
            </div>
            <div className="font-bold text-emerald-500">
              #{model.walCommitCount} (Atomic)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controller Bench (Directly drives the model) */}
      <div
        className="p-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: theme === "light" ? "#f8fafc" : "rgba(14, 16, 28, 0.96)",
          borderColor: theme === "light" ? "#eaedf5" : "rgba(139, 92, 246, 0.16)",
        }}
      >
        {/* Connection Knurled Selector */}
        <div className="flex items-center space-x-2">
          <span className="font-medium text-[#4b5563] dark:text-[#9ca3af]">
            {lang === "en" ? "Channels:" : "Kanal Koneksi:"}
          </span>
          <div className="inline-flex rounded-[6px] border border-[#d1d5db] dark:border-[#374151] p-0.5 bg-white dark:bg-[#1f2438]">
            {([1, 8, 16, 32] as ConnectionCount[]).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleSetConnections(num)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-[4px] transition-all ${
                  model.connections === num
                    ? "bg-[#6554c0] text-white font-bold shadow-sm"
                    : "text-[#4b5563] dark:text-[#9ca3af] hover:text-black dark:hover:text-white"
                }`}
                aria-label={`Set connections to ${num}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex items-center space-x-2">
          {model.state === "idle" || model.state === "completed" ? (
            <button
              type="button"
              onClick={handleStartOrResume}
              className="px-3.5 py-1.5 rounded-[6px] bg-[#6554c0] hover:bg-[#5343af] text-white font-medium shadow-sm transition-all text-[11px]"
            >
              {lang === "en" ? "Start Download" : "Mulai Unduhan"}
            </button>
          ) : model.state === "downloading" ? (
            <button
              type="button"
              onClick={handleSimulateCrash}
              className="px-3.5 py-1.5 rounded-[6px] bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm transition-all text-[11px]"
              title={lang === "en" ? "Simulate sudden power loss or process kill" : "Simulasikan mati listrik atau crash"}
            >
              {lang === "en" ? "Simulate Crash / Cut Power" : "Simulasi Crash / Putus Daya"}
            </button>
          ) : model.state === "interrupted" ? (
            <button
              type="button"
              onClick={handleRecoverWal}
              className="px-3.5 py-1.5 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all text-[11px]"
            >
              {lang === "en" ? "Recover via SQLite WAL" : "Pulihkan via SQLite WAL"}
            </button>
          ) : (
            <span className="text-amber-500 font-mono text-[11px]">
              {lang === "en" ? "Recovering..." : "Memulihkan..."}
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-[6px] border border-[#d1d5db] dark:border-[#374151] hover:bg-[#f3f4f6] dark:hover:bg-[#252b42] text-[#4b5563] dark:text-[#9ca3af] text-[11px]"
          >
            {lang === "en" ? "Reset" : "Atur Ulang"}
          </button>
        </div>
      </div>

      {/* Anatomy Hint Bar */}
      <div className="px-5 py-2 bg-black/5 dark:bg-black/30 border-t flex items-center justify-between text-[10px] text-[#6b7280] dark:text-[#8b95b2]"
        style={{ borderColor: theme === "light" ? "#eaedf5" : "rgba(139, 92, 246, 0.12)" }}
      >
        <span>
          {lang === "en"
            ? "Hint: Toggle channels or trigger crash to see byte offset preservation."
            : "Petunjuk: Ganti jumlah kanal atau simulasikan crash untuk melihat penyimpanan offset byte."}
        </span>
        <span className="font-mono">SQLite WAL Engine: Atomic Sync</span>
      </div>
    </div>
  );
}
