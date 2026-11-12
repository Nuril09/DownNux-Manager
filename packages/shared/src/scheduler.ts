import { z } from "zod";

/** Konfigurasi Penjadwal Unduhan (Scheduler) */
export const ScheduleConfig = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(["once", "recurring"]).default("recurring"),
  startTime: z.string().default("01:00"), // Format "HH:mm"
  stopTime: z.string().nullable().default("06:00"), // Format "HH:mm" atau null (tanpa batas)
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]), // 0 = Minggu, 1 = Senin, ...
  maxSimultaneous: z.number().int().min(1).max(10).default(1),
  onFinishAction: z.enum(["none", "quit", "sleep", "shutdown"]).default("none"),
});

export type ScheduleConfig = z.infer<typeof ScheduleConfig>;
export const ScheduleConfigPatch = ScheduleConfig.partial();
export type ScheduleConfigPatch = z.infer<typeof ScheduleConfigPatch>;

