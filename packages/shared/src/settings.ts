import { z } from "zod";
import { LIMITS } from "./constants.ts";

/** Pengaturan yang disimpan daemon di settings.json. */
export const Settings = z.object({
  // Tampilan & UI
  theme: z.enum(["system", "light", "dark"]).default("system"),
  accentColor: z.string().default("#6554c0"),
  blurLevel: z.enum(["high", "low"]).default("high"),
  language: z.enum(["en", "id"]).default("en"),

  // Folder & Penyimpanan
  downloadDir: z.string().default(""),
  categoryDirs: z
    .object({
      video: z.string().default(""),
      music: z.string().default(""),
      documents: z.string().default(""),
      compressed: z.string().default(""),
      programs: z.string().default(""),
      other: z.string().default(""),
    })
    .default({
      video: "",
      music: "",
      documents: "",
      compressed: "",
      programs: "",
      other: "",
    }),
  rememberLastDir: z.boolean().default(true),

  // Batas Kecepatan (Speed Limiter)
  speedLimiterEnabled: z.boolean().default(false),
  speedLimitBytesPerSec: z.number().int().min(0).default(0),

  // Koneksi & Engine
  defaultConnections: z.number().int().min(1).max(LIMITS.maxConnections).default(LIMITS.defaultConnections),
  maxConcurrent: z.number().int().min(1).max(32).default(LIMITS.defaultMaxConcurrent),
  autoResumeOnStart: z.boolean().default(true),
  retryCount: z.number().int().min(0).max(20).default(5),
  globalSpeedLimit: z.number().int().min(0).default(0),
  aria2Path: z.string().default(""),

  // Media & Video Quality Presets
  defaultVideoQuality: z.enum(["best", "1080", "720", "480"]).default("best"),
  defaultAudioQuality: z.enum(["320", "192", "128"]).default("320"),

  // Notifikasi & Pop-up
  showPreDownloadDialog: z.boolean().default(true),
  notifyOnStart: z.boolean().default(true),
  notifyOnComplete: z.boolean().default(true),
  soundOnComplete: z.boolean().default(false),
  onCompleteAction: z.enum(["none", "openFile", "openFolder"]).default("none"),
});
export type Settings = z.infer<typeof Settings>;
export const SettingsPatch = Settings.partial();
export type SettingsPatch = z.infer<typeof SettingsPatch>;

