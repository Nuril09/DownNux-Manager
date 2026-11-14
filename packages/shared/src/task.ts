import { z } from "zod";
import { LIMITS } from "./constants.ts";

/** Model status download, sesuai PRD bagian 10. */
export const TaskStatus = z.enum([
  "queued",
  "downloading",
  "paused",
  "retrying",
  "merging",
  "completed",
  "failed",
  "canceled",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

/** Status yang berarti download sedang "hidup" (dipegang engine atau menunggu retry). */
export const ACTIVE_STATUSES: readonly TaskStatus[] = ["downloading", "retrying", "merging"];
export const FINAL_STATUSES: readonly TaskStatus[] = ["completed", "failed", "canceled"];

export const TaskSource = z.enum(["manual", "browser", "clipboard", "cli"]);
export type TaskSource = z.infer<typeof TaskSource>;

/** Header yang diteruskan dari browser supaya link bersesi tetap bisa diunduh. */
export const RequestHeaders = z.object({
  cookie: z.string().max(64 * 1024).optional(),
  referer: z.string().max(8 * 1024).optional(),
  userAgent: z.string().max(1024).optional(),
  format: z.string().optional(),
  videoQuality: z.string().optional(),
  audioQuality: z.string().optional(),
});
export type RequestHeaders = z.infer<typeof RequestHeaders>;

export const AddTaskInput = z.object({
  url: z
    .string()
    .min(1)
    .refine(
      (u) =>
        /^(https?:\/\/|magnet:\?|file:\/\/|\/)/i.test(u) ||
        u.endsWith(".torrent") ||
        u.startsWith("data:application/x-bittorrent"),
      "URL harus berupa http/https, magnet link (magnet:?), atau file .torrent",
    ),
  torrentBase64: z.string().optional(),
  /** Folder tujuan absolut. Kosong = folder default dari pengaturan. */
  dir: z.string().optional(),
  /** Nama file. Kosong = ditentukan dari server (Content-Disposition / URL). */
  filename: z.string().max(255).optional(),
  connections: z.number().int().min(1).max(LIMITS.maxConnections).optional(),
  headers: RequestHeaders.optional(),
  source: TaskSource.default("manual"),
  /** false = masukkan antrean dalam keadaan dijeda. */
  start: z.boolean().default(true),
});
export type AddTaskInput = z.input<typeof AddTaskInput>;

export const TaskError = z.object({
  code: z.string(),
  message: z.string(),
});
export type TaskError = z.infer<typeof TaskError>;

export const Task = z.object({
  id: z.string(),
  url: z.string(),
  dir: z.string(),
  /** Nama file final. Bisa kosong sampai server memberi tahu. */
  filename: z.string(),
  status: TaskStatus,
  totalBytes: z.number(),
  completedBytes: z.number(),
  /** byte/detik, hanya bermakna saat downloading. */
  speed: z.number(),
  connections: z.number(),
  /** Jumlah koneksi yang benar-benar aktif saat ini. */
  activeConnections: z.number(),
  source: TaskSource,
  retryCount: z.number(),
  nextRetryAt: z.number().nullable(),
  error: TaskError.nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable(),

  // Extended fields for BitTorrent & Advanced Segment/Speed Inspector
  isTorrent: z.boolean().optional(),
  uploadSpeed: z.number().optional(),
  uploadBytes: z.number().optional(),
  numSeeders: z.number().optional(),
  pieceLength: z.number().optional(),
  numPieces: z.number().optional(),
  bitfield: z.string().optional(),
  speedHistory: z.array(z.number()).optional(),
});
export type Task = z.infer<typeof Task>;
