import { z } from "zod";
import { LIMITS } from "./constants.ts";

/** Pengaturan yang disimpan daemon di settings.json. */
export const Settings = z.object({
  /** Folder default. Kosong = folder Download pengguna (XDG). */
  downloadDir: z.string().default(""),
  defaultConnections: z.number().int().min(1).max(LIMITS.maxConnections).default(LIMITS.defaultConnections),
  maxConcurrent: z.number().int().min(1).max(32).default(LIMITS.defaultMaxConcurrent),
  /** Lanjutkan otomatis download yang terputus saat daemon start (PRD 6.2). */
  autoResumeOnStart: z.boolean().default(true),
  /** Batas kecepatan global dalam byte/detik. 0 = tanpa batas. */
  globalSpeedLimit: z.number().int().min(0).default(0),
  /** Lokasi biner aria2c. Kosong = cari otomatis. */
  aria2Path: z.string().default(""),
});
export type Settings = z.infer<typeof Settings>;
export const SettingsPatch = Settings.partial();
export type SettingsPatch = z.infer<typeof SettingsPatch>;

