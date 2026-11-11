import fs from "node:fs";
import path from "node:path";

/** Bersihkan nama file dari input luar (browser/URL) supaya tidak bisa keluar folder. */
export function sanitizeFilename(name: string): string {
  let n = name.replace(/[\u0000-\u001f/\\]/g, "_").trim();
  if (n === "." || n === "..") n = "";
  n = n.replace(/^\.+/, (m) => (m.length === n.length ? "" : m));
  // Batasi 255 byte (bukan karakter) untuk ext4.
  while (Buffer.byteLength(n, "utf8") > 255) n = n.slice(0, -1);
  return n;
}

/** Validasi folder tujuan: harus absolut, lalu dibuat jika belum ada. */
export function resolveTargetDir(dir: string): string {
  if (!path.isAbsolute(dir) || dir.includes("\0")) {
    throw new Error(`Folder tujuan harus path absolut: ${dir}`);
  }
  const resolved = path.resolve(dir);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

/** Path file di dalam dir, dengan jaminan tidak keluar dari dir. */
export function safeJoin(dir: string, filename: string): string | null {
  if (!filename) return null;
  const p = path.resolve(dir, filename);
  if (path.dirname(p) !== path.resolve(dir)) return null;
  return p;
}

export function unlinkQuiet(p: string): void {
  try {
    fs.unlinkSync(p);
  } catch {
    // abaikan
  }
}

