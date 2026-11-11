import fs from "node:fs";
import path from "node:path";
import { Settings, type SettingsPatch } from "@downnux/shared";
import { getUserDownloadDir } from "@downnux/shared/node";
import { logger } from "./log.ts";

const log = logger("settings");

export class SettingsStore {
  private current: Settings;
  private readonly file: string;

  constructor(configDir: string) {
    this.file = path.join(configDir, "settings.json");
    this.current = this.load();
  }

  get(): Settings {
    return this.current;
  }

  /** Folder unduhan efektif (pengaturan atau folder Download XDG). */
  downloadDir(): string {
    return this.current.downloadDir || getUserDownloadDir();
  }

  update(patch: SettingsPatch): Settings {
    const next = Settings.parse({ ...this.current, ...patch });
    if (next.downloadDir && !path.isAbsolute(next.downloadDir)) {
      throw new Error("downloadDir harus path absolut");
    }
    this.current = next;
    this.save();
    return next;
  }

  private load(): Settings {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return Settings.parse(raw);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        log.warn(`settings.json tidak valid, memakai default: ${(err as Error).message}`);
      }
      return Settings.parse({});
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.current, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
}

