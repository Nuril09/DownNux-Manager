import type { EventEmitter } from "node:events";
import type { RequestHeaders } from "@downnux/shared";

/**
 * Antarmuka engine download (PRD bagian 9).
 * Implementasi MVP memakai aria2. Engine sendiri (Rust/Go) kelak cukup
 * mengimplementasikan antarmuka ini tanpa mengubah manager, GUI, atau ekstensi.
 */
export interface JobSpec {
  url: string;
  dir: string;
  /** Kosong = biarkan engine menentukan dari server. */
  filename?: string;
  connections: number;
  headers?: RequestHeaders;
  /** byte/detik, 0 = tanpa batas. */
  speedLimit?: number;
  /** Optional base64-encoded torrent data for .torrent uploads */
  torrentBase64?: string;
}

/** Cara manager harus menanggapi error dari engine. */
export type ErrorKind =
  /** Masalah jaringan sementara: coba lagi tanpa batas dengan backoff. */
  | "transient"
  /** Mungkin sementara (mis. HTTP 403/5xx): coba lagi beberapa kali, lalu gagal. */
  | "limited"
  /** Server tidak mendukung resume: hapus file parsial dan mulai dari awal. */
  | "restart"
  /** Gagal permanen (404, disk penuh, izin): laporkan ke pengguna. */
  | "fatal";

export interface JobError {
  code: string;
  message: string;
  kind: ErrorKind;
}

export type JobState = "active" | "waiting" | "paused" | "complete" | "error" | "removed";

export interface JobStatus {
  state: JobState;
  totalBytes: number;
  completedBytes: number;
  speed: number;
  connections: number;
  /** Path file final jika sudah diketahui. */
  path: string;
  error: JobError | null;

  // Extended BitTorrent & Segment data
  isTorrent?: boolean;
  uploadSpeed?: number;
  uploadBytes?: number;
  numSeeders?: number;
  pieceLength?: number;
  numPieces?: number;
  bitfield?: string;
  followedBy?: string[];
}

export interface EngineEvents {
  /** Proses engine mati lalu hidup lagi; semua job hilang dan harus dimulai ulang. */
  restarted: [];
}

export interface DownloadEngine extends EventEmitter<EngineEvents> {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  version(): string;
  add(spec: JobSpec): Promise<string>;
  /** Hentikan job tapi pertahankan file parsial agar bisa dilanjutkan. */
  stopJob(jobId: string): Promise<void>;
  /** null untuk job yang tidak dikenal engine. */
  statusMany(jobIds: string[]): Promise<Map<string, JobStatus | null>>;
  setGlobalSpeedLimit(bytesPerSec: number): Promise<void>;
}
