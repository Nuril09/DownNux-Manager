type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const min = order[(process.env.UNDUH_LOG_LEVEL as Level) || "info"] ?? order.info;

function write(level: Level, scope: string, msg: string, extra?: unknown): void {
  if (order[level] < min) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${msg}`;
  if (extra !== undefined) {
    const detail = extra instanceof Error ? (extra.stack ?? extra.message) : JSON.stringify(extra);
    process.stderr.write(`${line} ${detail}\n`);
  } else {
    process.stderr.write(line + "\n");
  }
}

export function logger(scope: string) {
  return {
    debug: (m: string, e?: unknown) => write("debug", scope, m, e),
    info: (m: string, e?: unknown) => write("info", scope, m, e),
    warn: (m: string, e?: unknown) => write("warn", scope, m, e),
    error: (m: string, e?: unknown) => write("error", scope, m, e),
  };
}

