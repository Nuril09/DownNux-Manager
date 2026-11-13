/** Identitas resmi aplikasi DownNux Manager oleh HoodTech */
export const APP_ID = "downnux";
export const APP_NAME = "DownNux Manager";
export const DEVELOPER_NAME = "HoodTech";

/** Nama host native messaging (huruf kecil, titik, garis bawah saja). */
export const NATIVE_HOST_NAME = "com.creativemichiz.downnux.native_host";

export const PROTOCOL_VERSION = 1;

export const LIMITS = {
  /** aria2 membatasi max-connection-per-server di 16. Lihat docs/decisions.md. */
  maxConnections: 16,
  defaultConnections: 8,
  defaultMaxConcurrent: 3,
} as const;

