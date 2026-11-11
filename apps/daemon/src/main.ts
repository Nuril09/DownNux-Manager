import fs from "node:fs";
import path from "node:path";
import { PROTOCOL_VERSION, type DaemonInfo, type Method, type MethodResults } from "@downnux/shared";
import { ensurePrivateDir, getAppPaths } from "@downnux/shared/node";
import { TaskStore } from "./db.ts";
import { Aria2Engine } from "./engine/aria2.ts";
import { logger } from "./log.ts";
import { DownloadManager } from "./manager.ts";
import { IpcServer, assertSocketFree } from "./server.ts";
import { SettingsStore } from "./settings.ts";

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
  const engine = new Aria2Engine({
    binary: settings.get().aria2Path || undefined,
    logDir: paths.logDir,
    pidFile: path.join(paths.runtimeDir, "aria2.pid"),
  });
  const manager = new DownloadManager(store, engine, settings);

  let shuttingDown = false;
  const shutdown = async (reason: string, pauseAll = false) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`Berhenti (${reason})...`);
    try {
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
    "settings.get": () => settings.get(),
    "settings.update": (p) => {
      const next = settings.update(p);
      manager.onSettingsChanged();
      return next;
    },
    "daemon.shutdown": (p) => {
      setTimeout(() => void shutdown("diminta klien", p?.pauseAll ?? false), 50);
      return { ok: true } as const;
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
