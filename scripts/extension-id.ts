/**
 * Membuat (sekali) kunci ekstensi Chrome supaya ID ekstensi tetap sama walau di-load unpacked.
 * ID yang stabil dibutuhkan untuk mengunci allowed_origins di manifest native messaging.
 *
 * Kunci privat disimpan di .secret/extension-key.pem (tidak ikut git).
 * Kunci publik ditulis ke field "key" di apps/extension/manifest.json.
 * Mencetak ID ekstensi ke stdout.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyPath = path.join(root, ".secret", "extension-key.pem");
const manifestPath = path.join(root, "apps", "extension", "manifest.json");

if (!fs.existsSync(keyPath)) {
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  fs.writeFileSync(keyPath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
}

const priv = crypto.createPrivateKey(fs.readFileSync(keyPath));
const pubDer = crypto.createPublicKey(priv).export({ type: "spki", format: "der" });

// ID Chrome = 32 karakter pertama hex SHA-256 dari kunci publik, dengan 0-f dipetakan ke a-p.
const id = crypto
  .createHash("sha256")
  .update(pubDer)
  .digest("hex")
  .slice(0, 32)
  .replace(/[0-9a-f]/g, (c) => String.fromCharCode("a".charCodeAt(0) + parseInt(c, 16)));

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const key = pubDer.toString("base64");
if (manifest.key !== key) {
  manifest.key = key;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
process.stdout.write(id + "\n");

