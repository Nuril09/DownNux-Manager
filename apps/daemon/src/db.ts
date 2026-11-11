import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { RequestHeaders, Task, TaskError, TaskSource, TaskStatus } from "@downnux/shared";

/** Data task yang disimpan (tanpa field runtime seperti speed). */
export interface StoredTask {
  id: string;
  url: string;
  dir: string;
  filename: string;
  status: TaskStatus;
  totalBytes: number;
  completedBytes: number;
  connections: number;
  source: TaskSource;
  headers: RequestHeaders | null;
  retryCount: number;
  error: TaskError | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

interface Row {
  id: string;
  url: string;
  dir: string;
  filename: string;
  status: string;
  total_bytes: number;
  completed_bytes: number;
  connections: number;
  source: string;
  headers_json: string | null;
  retry_count: number;
  error_json: string | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

const MIGRATIONS: string[] = [
  `CREATE TABLE tasks (
     id TEXT PRIMARY KEY,
     url TEXT NOT NULL,
     dir TEXT NOT NULL,
     filename TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL,
     total_bytes INTEGER NOT NULL DEFAULT 0,
     completed_bytes INTEGER NOT NULL DEFAULT 0,
     connections INTEGER NOT NULL,
     source TEXT NOT NULL,
     headers_json TEXT,
     retry_count INTEGER NOT NULL DEFAULT 0,
     error_json TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     completed_at INTEGER
   );
   CREATE INDEX tasks_status ON tasks(status);
   CREATE INDEX tasks_created ON tasks(created_at);`,
];

export class TaskStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(dbPath);
    // Cookie disimpan di sini, jadi hanya pemilik yang boleh membaca.
    fs.chmodSync(dbPath, 0o600);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 2000;");
    this.migrate();
  }

  private migrate(): void {
    const row = this.db.prepare("PRAGMA user_version").get() as { user_version: number };
    for (let v = row.user_version; v < MIGRATIONS.length; v++) {
      this.db.exec("BEGIN");
      try {
        this.db.exec(MIGRATIONS[v]!);
        this.db.exec(`PRAGMA user_version = ${v + 1}`);
        this.db.exec("COMMIT");
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    }
  }

  all(): StoredTask[] {
    const rows = this.db.prepare("SELECT * FROM tasks ORDER BY created_at ASC").all() as unknown as Row[];
    return rows.map(fromRow);
  }

  upsert(t: StoredTask): void {
    this.db
      .prepare(
        `INSERT INTO tasks (id, url, dir, filename, status, total_bytes, completed_bytes, connections,
                            source, headers_json, retry_count, error_json, created_at, updated_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           url=excluded.url, dir=excluded.dir, filename=excluded.filename, status=excluded.status,
           total_bytes=excluded.total_bytes, completed_bytes=excluded.completed_bytes,
           connections=excluded.connections, headers_json=excluded.headers_json,
           retry_count=excluded.retry_count, error_json=excluded.error_json,
           updated_at=excluded.updated_at, completed_at=excluded.completed_at`,
      )
      .run(
        t.id,
        t.url,
        t.dir,
        t.filename,
        t.status,
        t.totalBytes,
        t.completedBytes,
        t.connections,
        t.source,
        t.headers ? JSON.stringify(t.headers) : null,
        t.retryCount,
        t.error ? JSON.stringify(t.error) : null,
        t.createdAt,
        t.updatedAt,
        t.completedAt,
      );
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  close(): void {
    this.db.close();
  }
}

function fromRow(r: Row): StoredTask {
  return {
    id: r.id,
    url: r.url,
    dir: r.dir,
    filename: r.filename,
    status: r.status as TaskStatus,
    totalBytes: r.total_bytes,
    completedBytes: r.completed_bytes,
    connections: r.connections,
    source: r.source as TaskSource,
    headers: r.headers_json ? JSON.parse(r.headers_json) : null,
    retryCount: r.retry_count,
    error: r.error_json ? JSON.parse(r.error_json) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at,
  };
}

export function toPublicTask(
  t: StoredTask,
  runtime: { speed: number; activeConnections: number; nextRetryAt: number | null },
): Task {
  return {
    id: t.id,
    url: t.url,
    dir: t.dir,
    filename: t.filename,
    status: t.status,
    totalBytes: t.totalBytes,
    completedBytes: t.completedBytes,
    speed: runtime.speed,
    connections: t.connections,
    activeConnections: runtime.activeConnections,
    source: t.source,
    retryCount: t.retryCount,
    nextRetryAt: runtime.nextRetryAt,
    error: t.error,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    completedAt: t.completedAt,
  };
}

