import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "../log.ts";

const execFileAsync = promisify(execFile);
const log = logger("spotify");

export type SpotifyEntityKind = "track" | "episode" | "album" | "playlist" | "artist" | "show" | "unknown";

export interface SpotifyTrackMetadata {
  kind: "track" | "episode";
  id: string;
  canonicalUrl: string;
  title: string;
  artists: string[];
  displayName: string;
  durationMs: number;
  releaseYear?: string;
  coverUrl?: string;
  searchQuery: string;
}

export interface SpotifyCollectionInfo {
  kind: "album" | "playlist" | "artist" | "show";
  id: string;
  canonicalUrl: string;
  name?: string;
  trackCount?: number;
}

export type SpotifyResolveResult =
  | { supported: true; track: SpotifyTrackMetadata }
  | { supported: false; collection: SpotifyCollectionInfo; reason: string };

const SPOTIFY_HOST_RE = /(?:^|\.)(?:spotify\.com|spotify\.link|spoti\.fi)$/i;
const SPOTIFY_PATH_RE = /^\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(track|episode|album|playlist|artist|show)\/([a-zA-Z0-9]+)/i;

const CACHE_TTL_MS = 10 * 60 * 1000;
const resolveCache = new Map<string, { at: number; value: SpotifyResolveResult }>();

export function isSpotifyUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return SPOTIFY_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

export function parseSpotifyPath(rawUrl: string): { kind: SpotifyEntityKind; id: string } | null {
  try {
    const u = new URL(rawUrl.trim());
    const m = u.pathname.match(SPOTIFY_PATH_RE);
    if (!m || !m[1] || !m[2]) return null;
    return { kind: m[1].toLowerCase() as SpotifyEntityKind, id: m[2] };
  } catch {
    return null;
  }
}

export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "";
  const totalSec = Math.round(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

async function expandShortSpotifyUrl(rawUrl: string): Promise<string> {
  try {
    const u = new URL(rawUrl.trim());
    if (!/(?:^|\.)(?:spotify\.link|spoti\.fi)$/i.test(u.hostname)) {
      return rawUrl.trim();
    }
    const res = await fetch(u.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    return res.url || rawUrl.trim();
  } catch (err) {
    log.warn("Gagal memperluas short link Spotify:", err);
    return rawUrl.trim();
  }
}

function buildDisplayName(title: string, artists: string[]): string {
  const cleanTitle = title.trim();
  const cleanArtists = artists.map((a) => a.trim()).filter(Boolean);
  if (cleanArtists.length > 0) {
    return `${cleanArtists.join(", ")} - ${cleanTitle}`;
  }
  return cleanTitle || "spotify-audio";
}

function buildSearchQuery(title: string, artists: string[], kind: "track" | "episode"): string {
  const cleanTitle = title.trim();
  const cleanArtists = artists.map((a) => a.trim()).filter(Boolean);
  if (kind === "episode") {
    return [cleanArtists[0], cleanTitle, "podcast"].filter(Boolean).join(" ").trim();
  }
  if (cleanArtists.length > 0) {
    return `${cleanArtists.slice(0, 2).join(" ")} - ${cleanTitle} official audio`;
  }
  return `${cleanTitle} audio`;
}

export async function resolveSpotifyUrl(rawUrl: string): Promise<SpotifyResolveResult> {
  const expandedUrl = await expandShortSpotifyUrl(rawUrl);
  const parsed = parseSpotifyPath(expandedUrl);

  if (!parsed) {
    throw Object.assign(
      new Error("Link Spotify tidak dikenali. Gunakan link lagu (open.spotify.com/track/...) atau episode (open.spotify.com/episode/...)."),
      { kind: "fatal" as const },
    );
  }

  const cacheKey = `${parsed.kind}:${parsed.id}`;
  const cached = resolveCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const canonicalUrl = `https://open.spotify.com/${parsed.kind}/${parsed.id}`;

  if (parsed.kind !== "track" && parsed.kind !== "episode") {
    let name: string | undefined;
    let trackCount: number | undefined;
    try {
      const embedRes = await fetch(`https://open.spotify.com/embed/${parsed.kind}/${parsed.id}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (embedRes.ok) {
        const html = await embedRes.text();
        const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (m?.[1]) {
          const entity = JSON.parse(m[1])?.props?.pageProps?.state?.data?.entity;
          name = entity?.name || entity?.title;
          if (Array.isArray(entity?.trackList)) trackCount = entity.trackList.length;
        }
      }
    } catch {}

    const label = parsed.kind === "playlist" ? "playlist" : parsed.kind === "album" ? "album" : parsed.kind;
    const result: SpotifyResolveResult = {
      supported: false,
      collection: {
        kind: parsed.kind as SpotifyCollectionInfo["kind"],
        id: parsed.id,
        canonicalUrl,
        name,
        trackCount,
      },
      reason: `Link ${label} Spotify${name ? ` ("${name}")` : ""} belum didukung untuk unduhan massal. Salin link lagu (track) atau episode tunggalnya.`,
    };
    resolveCache.set(cacheKey, { at: Date.now(), value: result });
    return result;
  }

  let title = "";
  let artists: string[] = [];
  let durationMs = 0;
  let releaseYear: string | undefined;
  let coverUrl: string | undefined;

  // 1. Primary source: Spotify public embed page (__NEXT_DATA__) includes title, artists, duration, release date, and cover art
  try {
    const embedRes = await fetch(`https://open.spotify.com/embed/${parsed.kind}/${parsed.id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (embedRes.ok) {
      const html = await embedRes.text();
      const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (nextMatch?.[1]) {
        const data = JSON.parse(nextMatch[1]);
        const entity = data?.props?.pageProps?.state?.data?.entity;
        if (entity) {
          title = String(entity.title || entity.name || "").trim();
          if (Array.isArray(entity.artists)) {
            artists = entity.artists
              .map((a: { name?: string }) => String(a?.name || "").trim())
              .filter(Boolean);
          } else if (typeof entity.subtitle === "string" && entity.subtitle.trim()) {
            artists = [entity.subtitle.trim()];
          }
          if (typeof entity.duration === "number" && entity.duration > 0) {
            durationMs = entity.duration;
          }
          const iso = entity.releaseDate?.isoString;
          if (typeof iso === "string" && iso.length >= 4) {
            releaseYear = iso.slice(0, 4);
          }
          coverUrl =
            entity.visualIdentity?.image?.[0]?.url ||
            entity.coverArt?.sources?.[0]?.url ||
            undefined;
        }
      }
    }
  } catch (err) {
    log.warn("Gagal membaca metadata embed Spotify, mencoba fallback oEmbed:", err);
  }

  // 2. Fallback source: Spotify public oEmbed API
  if (!title) {
    try {
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(canonicalUrl)}`, {
        signal: AbortSignal.timeout(7000),
      });
      if (oembedRes.ok) {
        const oembed = (await oembedRes.json()) as { title?: string; thumbnail_url?: string };
        title = String(oembed.title || "").trim();
        if (!coverUrl && oembed.thumbnail_url) {
          coverUrl = oembed.thumbnail_url;
        }
      }
    } catch (err) {
      log.warn("Gagal membaca metadata oEmbed Spotify:", err);
    }
  }

  if (!title) {
    throw Object.assign(
      new Error("Tidak dapat membaca metadata lagu dari link Spotify ini. Pastikan link publik dan valid."),
      { kind: "fatal" as const },
    );
  }

  const displayName = buildDisplayName(title, artists);
  const searchQuery = buildSearchQuery(title, artists, parsed.kind);

  const result: SpotifyResolveResult = {
    supported: true,
    track: {
      kind: parsed.kind,
      id: parsed.id,
      canonicalUrl,
      title,
      artists,
      displayName,
      durationMs,
      releaseYear,
      coverUrl,
      searchQuery,
    },
  };
  resolveCache.set(cacheKey, { at: Date.now(), value: result });
  return result;
}

export interface YoutubeAudioCandidate {
  id: string;
  title: string;
  durationSec: number;
}

const PENALTY_KEYWORDS = [
  "live",
  "remix",
  "cover",
  "sped up",
  "slowed",
  "nightcore",
  "8d",
  "karaoke",
  "instrumental",
  "mashup",
  "reaction",
  "tutorial",
  "guitar",
  "piano cover",
  "1 hour",
  "10 hours",
];

/**
 * Pilih kandidat YouTube terbaik berdasarkan kedekatan durasi dan kecocokan judul
 * supaya tidak salah memilih video klip berintro panjang, cover, atau versi 1 jam.
 */
export function pickBestYoutubeCandidate(
  candidates: YoutubeAudioCandidate[],
  track: Pick<SpotifyTrackMetadata, "title" | "artists" | "durationMs">,
): YoutubeAudioCandidate | null {
  if (candidates.length === 0) return null;

  const targetSec = track.durationMs > 0 ? Math.round(track.durationMs / 1000) : 0;
  const spotifyTitleLower = track.title.toLowerCase();
  const primaryArtistLower = (track.artists[0] || "").toLowerCase();

  let best: YoutubeAudioCandidate | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const cand of candidates) {
    const titleLower = cand.title.toLowerCase();
    let score = 0;

    if (targetSec > 0 && cand.durationSec > 0) {
      const diff = Math.abs(cand.durationSec - targetSec);
      if (diff <= 5) score += 60;
      else if (diff <= 15) score += 45;
      else if (diff <= 30) score += 25;
      else if (diff <= 60) score += 5;
      else score -= Math.min(120, diff * 0.5);
    }

    if (titleLower.includes("official audio")) score += 28;
    else if (titleLower.includes("provided to youtube") || titleLower.includes("topic")) score += 24;
    else if (titleLower.includes("audio")) score += 14;
    else if (titleLower.includes("lyrics")) score += 10;

    if (titleLower.includes("official video") || titleLower.includes("music video")) {
      score -= 8;
    }

    if (spotifyTitleLower && titleLower.includes(spotifyTitleLower)) {
      score += 20;
    }
    if (primaryArtistLower && titleLower.includes(primaryArtistLower)) {
      score += 15;
    }

    for (const kw of PENALTY_KEYWORDS) {
      if (titleLower.includes(kw) && !spotifyTitleLower.includes(kw)) {
        score -= 35;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return best || candidates[0] || null;
}

export async function findBestYoutubeUrlForSpotify(
  ytDlpBin: string,
  track: SpotifyTrackMetadata,
): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      ytDlpBin,
      [
        "--flat-playlist",
        "--no-warnings",
        "--print",
        "%(id)s;;;%(title)s;;;%(duration)s",
        `ytsearch5:${track.searchQuery}`,
      ],
      { encoding: "utf8", timeout: 12_000, windowsHide: true },
    );

    const candidates: YoutubeAudioCandidate[] = [];
    for (const rawLine of stdout.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      const [id, title, durationStr] = line.split(";;;");
      if (!id || id === "NA") continue;
      const durationSec = Number(durationStr);
      candidates.push({
        id: id.trim(),
        title: (title || "").trim(),
        durationSec: Number.isFinite(durationSec) ? durationSec : 0,
      });
    }

    const best = pickBestYoutubeCandidate(candidates, track);
    if (best) {
      log.info(`Spotify "${track.displayName}" cocok ke YouTube: ${best.id} (${best.title}, ${best.durationSec}s)`);
      return `https://www.youtube.com/watch?v=${best.id}`;
    }
  } catch (err) {
    log.warn("Pencarian kandidat YouTube gagal, fallback ke ytsearch1:", err);
  }

  return `ytsearch1:${track.searchQuery}`;
}
