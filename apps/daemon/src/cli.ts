/**
 * CLI kecil untuk mengendalikan daemon sebelum GUI ada.
 *   unduh add <url> [--dir D] [--name F] [-c N] [--paused]
 *   unduh ls | watch | ping
 *   unduh pause|resume|cancel|rm <id-prefix>
 *   unduh pause-all | resume-all | shutdown
 */
import path from "node:path";
import type { Task } from "@downnux/shared";
import { DaemonClient } from "@downnux/shared/node";

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

function fmtTask(t: Task): string {
  const pct = t.totalBytes ? ((t.completedBytes / t.totalBytes) * 100).toFixed(1).padStart(5) + "%" : "    ?";
  const speed = t.status === "downloading" ? `${fmtBytes(t.speed)}/s`.padStart(11) : "".padStart(11);
  const size = `${fmtBytes(t.completedBytes)}/${fmtBytes(t.totalBytes)}`.padStart(20);
  const err = t.error && t.status !== "completed" ? `  (${t.error.message})` : "";
  const conn = t.status === "downloading" ? ` [${t.activeConnections}c]` : "";
  return `${t.id.slice(0, 8)}  ${t.status.padEnd(11)} ${pct} ${size} ${speed}${conn}  ${t.filename || t.url}${err}`;
}

function arg(args: string[], ...names: string[]): string | undefined {
  for (const n of names) {
    const i = args.indexOf(n);
    if (i >= 0) {
      const v = args[i + 1];
      args.splice(i, 2);
      return v;
    }
  }
  return undefined;
}

function flag(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
}

async function resolveId(c: DaemonClient, prefix: string | undefined): Promise<string> {
  if (!prefix) throw new Error("ID download diperlukan");
  const matches = (await c.call("task.list")).filter((t) => t.id.startsWith(prefix));
  if (matches.length !== 1) throw new Error(matches.length ? `ID ambigu: ${prefix}` : `Tidak ditemukan: ${prefix}`);
  return matches[0]!.id;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args.shift();
  const c = new DaemonClient();
  try {
    await c.connect();
  } catch {
    console.error("Daemon tidak berjalan. Jalankan `pnpm daemon` atau `systemctl --user start unduh-daemon`.");
    process.exit(2);
  }
  try {
    switch (cmd) {
      case "ping":
        console.log(await c.call("ping"));
        break;
      case "add": {
        const dir = arg(args, "--dir", "-d");
        const filename = arg(args, "--name", "-o");
        const conn = arg(args, "-c", "--connections");
        const paused = flag(args, "--paused");
        const url = args[0];
        if (!url) throw new Error("URL diperlukan");
        const t = await c.call("task.add", {
          url,
          dir: dir ? path.resolve(dir) : undefined,
          filename,
          connections: conn ? Number(conn) : undefined,
          source: "cli",
          start: !paused,
        });
        console.log(fmtTask(t));
        break;
      }
      case "ls":
      case "list":
        for (const t of await c.call("task.list")) console.log(fmtTask(t));
        break;
      case "watch": {
        const tasks = new Map((await c.call("task.list")).map((t) => [t.id, t]));
        await c.call("subscribe");
        const draw = () => {
          process.stdout.write("\x1b[2J\x1b[H");
          for (const t of tasks.values()) console.log(fmtTask(t));
        };
        draw();
        c.on("event", (ev) => {
          if (ev.event === "task.updated") tasks.set(ev.data.id, ev.data);
          else if (ev.event === "task.removed") tasks.delete(ev.data.id);
        });
        setInterval(draw, 1000);
        return; // tetap hidup
      }
      case "pause":
        console.log(fmtTask(await c.call("task.pause", { id: await resolveId(c, args[0]) })));
        break;
      case "resume":
        console.log(fmtTask(await c.call("task.resume", { id: await resolveId(c, args[0]) })));
        break;
      case "cancel": {
        const keepPartial = flag(args, "--keep");
        console.log(fmtTask(await c.call("task.cancel", { id: await resolveId(c, args[0]), keepPartial })));
        break;
      }
      case "rm": {
        const deleteFile = flag(args, "--delete-file");
        await c.call("task.remove", { id: await resolveId(c, args[0]), deleteFile });
        console.log("Dihapus dari daftar.");
        break;
      }
      case "pause-all":
        console.log(await c.call("task.pauseAll"));
        break;
      case "resume-all":
        console.log(await c.call("task.resumeAll"));
        break;
      case "settings":
        console.log(await c.call("settings.get"));
        break;
      case "shutdown":
        console.log(await c.call("daemon.shutdown", { pauseAll: flag(args, "--pause-all") }));
        break;
      default:
        console.log(
          "Perintah: ping | add <url> [--dir D] [--name F] [-c N] [--paused] | ls | watch |\n" +
            "          pause <id> | resume <id> | cancel <id> [--keep] | rm <id> [--delete-file] |\n" +
            "          pause-all | resume-all | settings | shutdown [--pause-all]",
        );
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exitCode = 1;
  }
  c.close();
}

void main();

