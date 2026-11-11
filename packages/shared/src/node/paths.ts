import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { APP_ID } from "../constants.ts";

/**
 * Lokasi file mengikuti XDG Base Directory.
 * UNDUH_HOME menimpa semuanya ke satu folder (dipakai tes dan pengembangan).
 */
export interface AppPaths {
  configDir: string;
  dataDir: string;
  stateDir: string;
  runtimeDir: string;
  socketPath: string;
  dbPath: string;
  logDir: string;
}

export function getAppPaths(env: NodeJS.ProcessEnv = process.env): AppPaths {
  const override = env.UNDUH_HOME;
  if (override) {
    const root = path.resolve(override);
    return build({
      configDir: path.join(root, "config"),
      dataDir: path.join(root, "data"),
      stateDir: path.join(root, "state"),
      runtimeDir: path.join(root, "run"),
    });
  }
  const home = os.homedir();
  const uid = typeof process.getuid === "function" ? process.getuid() : 0;
  return build({
    configDir: path.join(env.XDG_CONFIG_HOME || path.join(home, ".config"), APP_ID),
    dataDir: path.join(env.XDG_DATA_HOME || path.join(home, ".local", "share"), APP_ID),
    stateDir: path.join(env.XDG_STATE_HOME || path.join(home, ".local", "state"), APP_ID),
    runtimeDir: env.XDG_RUNTIME_DIR
      ? path.join(env.XDG_RUNTIME_DIR, APP_ID)
      : path.join(os.tmpdir(), `${APP_ID}-${uid}`),
  });
}

function build(p: Pick<AppPaths, "configDir" | "dataDir" | "stateDir" | "runtimeDir">): AppPaths {
  return {
    ...p,
    socketPath: path.join(p.runtimeDir, "daemon.sock"),
    dbPath: path.join(p.dataDir, "state.db"),
    logDir: path.join(p.stateDir, "logs"),
  };
}

/** Folder Download pengguna dari user-dirs.dirs, fallback ~/Downloads. */
export function getUserDownloadDir(env: NodeJS.ProcessEnv = process.env): string {
  const home = os.homedir();
  try {
    const cfg = path.join(env.XDG_CONFIG_HOME || path.join(home, ".config"), "user-dirs.dirs");
    const text = fs.readFileSync(cfg, "utf8");
    const m = text.match(/^XDG_DOWNLOAD_DIR="(.+)"$/m);
    if (m?.[1]) return m[1].replace(/^\$HOME/, home);
  } catch {
    // abaikan, pakai fallback
  }
  return path.join(home, "Downloads");
}

/** Buat folder dengan izin hanya-pemilik. */
export function ensurePrivateDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

