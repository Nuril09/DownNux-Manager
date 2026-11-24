import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDuration,
  isSpotifyUrl,
  parseSpotifyPath,
  pickBestYoutubeCandidate,
} from "../src/engine/spotify.ts";
import { isAudioOnlySite, isMediaSite } from "../src/engine/ytdlp.ts";

describe("spotify helpers", () => {
  it("recognizes standard, localized, embed, and short Spotify URLs", () => {
    assert.equal(isSpotifyUrl("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc"), true);
    assert.equal(isSpotifyUrl("https://open.spotify.com/intl-id/track/4cOdK2wGLETKBW3PvgPWqT"), true);
    assert.equal(isSpotifyUrl("https://open.spotify.com/embed/episode/512ojhOuo1ktJprKbVcKyQ"), true);
    assert.equal(isSpotifyUrl("https://spotify.link/abc123"), true);
    assert.equal(isSpotifyUrl("https://spoti.fi/xyz"), true);
    assert.equal(isSpotifyUrl("https://example.com/open.spotify.com/track/123"), false);
    assert.equal(isSpotifyUrl("ftp://open.spotify.com/track/123"), false);
  });

  it("parses Spotify entity kind and id across intl and embed prefixes", () => {
    assert.deepEqual(
      parseSpotifyPath("https://open.spotify.com/intl-id/track/4cOdK2wGLETKBW3PvgPWqT?si=123"),
      { kind: "track", id: "4cOdK2wGLETKBW3PvgPWqT" },
    );
    assert.deepEqual(
      parseSpotifyPath("https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M"),
      { kind: "playlist", id: "37i9dQZF1DXcBWIGoYBM5M" },
    );
    assert.equal(parseSpotifyPath("https://open.spotify.com/search/test"), null);
  });

  it("routes Spotify, SoundCloud, and Bandcamp as audio-only media sites", () => {
    assert.equal(isAudioOnlySite("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"), true);
    assert.equal(isMediaSite("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"), true);
    assert.equal(isAudioOnlySite("https://soundcloud.com/artist/track"), true);
    assert.equal(isAudioOnlySite("https://artist.bandcamp.com/track/song"), true);
    assert.equal(isAudioOnlySite("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), false);
    assert.equal(isMediaSite("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  });

  it("picks the closest official audio match over music videos, covers, and loops", () => {
    const picked = pickBestYoutubeCandidate(
      [
        { id: "vid1", title: "The Weeknd - Blinding Lights (Official Video)", durationSec: 263 },
        { id: "loop", title: "The Weeknd - Blinding Lights (1 Hour Loop)", durationSec: 3600 },
        { id: "cov1", title: "Blinding Lights Piano Cover", durationSec: 201 },
        { id: "aud1", title: "The Weeknd - Blinding Lights (Official Audio)", durationSec: 204 },
      ],
      { title: "Blinding Lights", artists: ["The Weeknd"], durationMs: 200_040 },
    );
    assert.equal(picked?.id, "aud1");
  });

  it("formats durations in m:ss", () => {
    assert.equal(formatDuration(213_573), "3:34");
    assert.equal(formatDuration(65_000), "1:05");
    assert.equal(formatDuration(0), "");
  });
});
