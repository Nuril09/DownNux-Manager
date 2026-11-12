import { z } from "zod";
import { AddTaskInput, type Task } from "./task.ts";
import { SettingsPatch, type Settings } from "./settings.ts";
import { ScheduleConfigPatch, type ScheduleConfig } from "./scheduler.ts";

/**
 * Protokol IPC daemon. Satu pesan JSON per baris (NDJSON) di atas Unix socket.
 *
 *   klien -> daemon : { id, method, params }
 *   daemon -> klien : { id, result } | { id, error }
 *   daemon -> klien : { event, data }   (hanya setelah "subscribe")
 */

const IdParams = z.object({ id: z.string() });

export const MethodParams = {
  ping: z.object({}).optional(),
  "task.add": AddTaskInput,
  "task.list": z.object({}).optional(),
  "task.get": IdParams,
  "task.pause": IdParams,
  "task.resume": IdParams,
  "task.cancel": IdParams.extend({ keepPartial: z.boolean().default(false) }),
  "task.remove": IdParams.extend({ deleteFile: z.boolean().default(false) }),
  "task.pauseAll": z.object({}).optional(),
  "task.resumeAll": z.object({}).optional(),
  "task.openFolder": IdParams,
  "task.probe": z.object({ url: z.string(), headers: z.record(z.string()).optional() }),
  "dialog.selectFolder": z.object({ defaultPath: z.string().optional() }).optional(),
  subscribe: z.object({}).optional(),
  "settings.get": z.object({}).optional(),
  "settings.update": SettingsPatch,
  "scheduler.get": z.object({}).optional(),
  "scheduler.update": ScheduleConfigPatch,
  "scheduler.runNow": z.object({}).optional(),
  /** Dipakai menu tray "Keluar": hentikan daemon. pauseAll=true menjeda semua dulu. */
  "daemon.shutdown": z.object({ pauseAll: z.boolean().default(false) }).optional(),
} as const;

export type Method = keyof typeof MethodParams;
export type ParamsOf<M extends Method> = z.input<(typeof MethodParams)[M]>;

export interface DaemonInfo {
  version: string;
  protocol: number;
  pid: number;
  engine: { name: string; version: string };
}

export interface UrlProbeResult {
  url: string;
  filename: string;
  size: number;
  formattedSize: string;
  resumeSupported: boolean;
  category: "video" | "music" | "documents" | "compressed" | "programs" | "all";
  contentType?: string;
  isMedia: boolean;
  defaultDir: string;
}

export interface MethodResults {
  ping: DaemonInfo;
  "task.add": Task;
  "task.list": Task[];
  "task.get": Task;
  "task.pause": Task;
  "task.resume": Task;
  "task.cancel": Task;
  "task.remove": { ok: true };
  "task.pauseAll": { count: number };
  "task.resumeAll": { count: number };
  "task.openFolder": { ok: true };
  "task.probe": UrlProbeResult;
  "dialog.selectFolder": { ok: boolean; path?: string };
  subscribe: { ok: true };
  "settings.get": Settings;
  "settings.update": Settings;
  "scheduler.get": ScheduleConfig;
  "scheduler.update": ScheduleConfig;
  "scheduler.runNow": { ok: boolean };
  "daemon.shutdown": { ok: true };
}

export interface RpcRequest {
  id: number | string;
  method: string;
  params?: unknown;
}

export interface RpcErrorBody {
  code: RpcErrorCode;
  message: string;
}

export type RpcErrorCode =
  | "BAD_REQUEST"
  | "UNKNOWN_METHOD"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "ENGINE_ERROR"
  | "INTERNAL";

export type RpcResponse =
  | { id: number | string; result: unknown }
  | { id: number | string | null; error: RpcErrorBody };

export type DaemonEvent =
  | { event: "task.updated"; data: Task }
  | { event: "task.removed"; data: { id: string } };

export function isMethod(m: string): m is Method {
  return Object.prototype.hasOwnProperty.call(MethodParams, m);
}
