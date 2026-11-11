import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DaemonClient } from "../packages/shared/src/node/client.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getRss(pid: number): number {
  try {
    const statm = fs.readFileSync(`/proc/${pid}/statm`, "utf8");
    const pages = Number(statm.trim().split(/\s+/)[1]);
    const pageSize = 4096; // 4KB page
    return Math.round((pages * pageSize) / (1024 * 1024)); // MB
  } catch {
    return 0;
  }
}

async function main() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "downnux-mem-"));
  const sock = path.join(home, "run", "daemon.sock");
  const daemonProc = spawn(process.execPath, ["--import", "tsx", "--no-warnings", "apps/daemon/src/main.ts"], {
    env: { ...process.env, UNDUH_HOME: home },
    stdio: "ignore",
  });

  await sleep(2000);
  const client = new DaemonClient(sock);
  await client.connect();
  const info = await client.call("ping");
  console.log("Daemon info:", info);

  const aria2Pid = Number(fs.readFileSync(path.join(home, "run", "aria2.pid"), "utf8").trim());
  const daemonPid = daemonProc.pid!;

  console.log("=== Memory Measurement (Idle) ===");
  console.log(`Node.js Daemon (PID ${daemonPid}): ${getRss(daemonPid)} MB (Budget: <= 80 MB)`);
  console.log(`aria2c Engine  (PID ${aria2Pid}): ${getRss(aria2Pid)} MB (Budget: <= 20 MB)`);
  console.log(`Total Idle Background RSS: ${getRss(daemonPid) + getRss(aria2Pid)} MB (Budget: <= 100 MB)`);

  client.close();
  daemonProc.kill("SIGTERM");
  await sleep(1000);
  fs.rmSync(home, { recursive: true, force: true });
}

main().catch(console.error);

