import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile, spawn } from "node:child_process";
import { PROTOCOL_VERSION, type DaemonInfo, type Method, type MethodResults } from "@downnux/shared";
import { ensurePrivateDir, getAppPaths } from "@downnux/shared/node";
import { TaskStore } from "./db.ts";
import { Aria2Engine } from "./engine/aria2.ts";
import { HybridEngine } from "./engine/hybrid.ts";
import { logger } from "./log.ts";
import { DownloadManager } from "./manager.ts";
import { IpcServer, assertSocketFree } from "./server.ts";
import { SettingsStore } from "./settings.ts";
import { SchedulerStore, SchedulerEngine } from "./scheduler.ts";
import { probeUrl } from "./probe.ts";

const execFileAsync = promisify(execFile);

const log = logger("daemon");
const VERSION: string = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

async function main(): Promise<void> {
  const paths = getAppPaths();
  for (const d of [paths.configDir, paths.dataDir, paths.stateDir, paths.runtimeDir, paths.logDir]) {
    ensurePrivateDir(d);
  }

  const settings = new SettingsStore(paths.configDir);
  const store = new TaskStore(paths.dbPath);
  const aria2 = new Aria2Engine({
    binary: settings.get().aria2Path || undefined,
    logDir: paths.logDir,
    pidFile: path.join(paths.runtimeDir, "aria2.pid"),
  });
  const engine = new HybridEngine(aria2);
  const manager = new DownloadManager(store, engine, settings);
  const schedulerStore = new SchedulerStore(paths.configDir);
  const schedulerEngine = new SchedulerEngine(schedulerStore, manager);

  let shuttingDown = false;
  const shutdown = async (reason: string, pauseAll = false) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`Berhenti (${reason})...`);
    try {
      schedulerEngine.stop();
      if (pauseAll) await manager.pauseAll();
      await manager.shutdown();
      await server.close();
      await engine.stop();
      store.close();
    } catch (err) {
      log.error("Error saat berhenti", err);
    }
    process.exit(0);
  };

  const handlers: { [M in Method]?: (p: any) => Promise<MethodResults[M]> | MethodResults[M] } = {
    ping: (): DaemonInfo => ({
      version: VERSION,
      protocol: PROTOCOL_VERSION,
      pid: process.pid,
      engine: { name: engine.name, version: engine.version() },
    }),
    "task.add": (p) => manager.add(p),
    "task.list": () => manager.list(),
    "task.get": (p) => manager.get(p.id),
    "task.pause": (p) => manager.pause(p.id),
    "task.resume": (p) => manager.resume(p.id),
    "task.cancel": (p) => manager.cancel(p.id, p.keepPartial),
    "task.remove": async (p) => {
      await manager.remove(p.id, p.deleteFile);
      return { ok: true } as const;
    },
    "task.pauseAll": async () => ({ count: await manager.pauseAll() }),
    "task.resumeAll": () => ({ count: manager.resumeAll() }),
    "task.openFolder": (p) => manager.openFolder(p.id),
    "task.openFile": (p) => manager.openFile(p.id),
    "task.repair": (p) => manager.repair(p.id),
    "task.probe": (p) => probeUrl(p.url, settings.downloadDir(), p.headers, settings.get().categoryDirs),
    "dialog.selectFolder": async () => {
      try {
        const { stdout } = await execFileAsync("zenity", [
          "--file-selection",
          "--directory",
          "--title=Pilih Folder Unduhan DownNux",
        ], {
          env: {
            ...process.env,
            DISPLAY: process.env.DISPLAY || ":0",
            WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "wayland-0",
          },
        });
        const chosen = stdout.trim();
        return { ok: Boolean(chosen), path: chosen };
      } catch (err) {
        log.warn("Folder chooser canceled or error:", err);
        return { ok: false };
      }
    },
    "settings.get": () => settings.get(),
    "settings.update": (p) => {
      const next = settings.update(p);
      manager.onSettingsChanged();
      return next;
    },
    "scheduler.get": () => schedulerStore.get(),
    "scheduler.update": (p) => schedulerStore.update(p),
    "scheduler.runNow": () => schedulerEngine.runNow(),
    "daemon.shutdown": (p) => {
      setTimeout(() => void shutdown("diminta klien", p?.pauseAll ?? false), 50);
      return { ok: true } as const;
    },
    "app.checkUpdate": async () => {
      const CURRENT_VERSION = VERSION || "0.0.4";
      try {
        const res = await fetch("https://api.github.com/repos/Nuril09/DownNux-Manager/releases/latest", {
          headers: { "User-Agent": "DownNux-Manager-Updater" },
        });
        const isDev = fs.existsSync(path.join(process.cwd(), "scripts/install-dev.sh"));
        if (!res.ok) {
          return {
            currentVersion: CURRENT_VERSION,
            latestVersion: CURRENT_VERSION,
            hasUpdate: false,
            releaseName: `DownNux Manager v${CURRENT_VERSION}`,
            releaseUrl: "https://github.com/Nuril09/DownNux-Manager/releases",
            releaseNotes: "Local build active. No remote releases returned.",
            publishedAt: new Date().toISOString(),
            isDev,
          };
        }
        const data = await res.json() as any;
        const tag = (data.tag_name || "").replace(/^v/, "");
        const hasUpdate = Boolean(tag && tag !== CURRENT_VERSION);
        return {
          currentVersion: CURRENT_VERSION,
          latestVersion: tag || CURRENT_VERSION,
          hasUpdate,
          releaseName: data.name || data.tag_name,
          releaseUrl: data.html_url,
          releaseNotes: data.body || "",
          publishedAt: data.published_at || new Date().toISOString(),
          assets: (data.assets || []).map((a: any) => ({
            name: a.name,
            size: a.size,
            downloadUrl: a.browser_download_url,
          })),
          isDev,
        };
      } catch {
        return {
          currentVersion: CURRENT_VERSION,
          latestVersion: CURRENT_VERSION,
          hasUpdate: false,
          releaseName: `DownNux Manager v${CURRENT_VERSION}`,
          releaseUrl: "https://github.com/Nuril09/DownNux-Manager/releases",
          releaseNotes: "Unable to connect to GitHub releases.",
          publishedAt: new Date().toISOString(),
          isDev: fs.existsSync(path.join(process.cwd(), "scripts/install-dev.sh")),
        };
      }
    },
    "app.rebuildDev": async () => {
      const scriptPath = path.join(process.cwd(), "scripts/install-dev.sh");
      if (!fs.existsSync(scriptPath)) {
        return { ok: false, error: "Not in dev workspace" };
      }
      try {
        const child = spawn("bash", [scriptPath], {
          cwd: process.cwd(),
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        return { ok: true, message: "Rebuilding and refreshing in background..." };
      } catch (err: any) {
        return { ok: false, error: err.message };
      }
    },
  };

  const server = new IpcServer(paths.socketPath, async (method, params) => {
    const h = handlers[method];
    if (!h) throw new Error(`Method belum diimplementasikan: ${method}`);
    return h(params);
  });

  // Pastikan tidak ada daemon lain yang sedang berjalan.
  await assertSocketFree(paths.socketPath);
  await engine.start();
  await engine.setGlobalSpeedLimit(settings.get().globalSpeedLimit);

  manager.on("task", (t) => server.broadcast({ event: "task.updated", data: t }));
  manager.on("removed", (id) => server.broadcast({ event: "task.removed", data: { id } }));
  manager.init();

  // Socket dibuka TERAKHIR setelah database dan engine sudah 100% siap melayani request.
  await server.listen();

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("uncaughtException", (err) => log.error("uncaughtException", err));
  process.on("unhandledRejection", (err) => log.error("unhandledRejection", err));

  log.info(`Daemon ${VERSION} siap (pid ${process.pid})`);
}

main().catch((err) => {
  log.error("Daemon gagal start", err);
  process.exit(1);
});
