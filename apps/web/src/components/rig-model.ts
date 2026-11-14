export type ConnectionCount = 1 | 8 | 16 | 32;
export type RigState = "idle" | "downloading" | "interrupted" | "recovering" | "completed";

export interface RigModel {
  connections: ConnectionCount;
  state: RigState;
  progressPercent: number;
  transferredMb: number;
  totalMb: number;
  speedMbps: number;
  dialAngleDeg: number;
  walCommitCount: number;
  segments: number[]; // 32 segments with value 0 to 1
}

const TOTAL_MB = 1536; // 1.5 GB

export function createInitialModel(): RigModel {
  return {
    connections: 16,
    state: "idle",
    progressPercent: 0,
    transferredMb: 0,
    totalMb: TOTAL_MB,
    speedMbps: 0,
    dialAngleDeg: -120, // Zero point on dial (-120deg to +120deg)
    walCommitCount: 0,
    segments: new Array(32).fill(0),
  };
}

export function calculateSpeed(conns: ConnectionCount, state: RigState): number {
  if (state === "interrupted" || state === "idle" || state === "completed") return 0;
  if (state === "recovering") return 6.5;
  switch (conns) {
    case 1:
      return 2.4;
    case 8:
      return 14.6;
    case 16:
      return 26.8;
    case 32:
      return 48.2;
  }
}
