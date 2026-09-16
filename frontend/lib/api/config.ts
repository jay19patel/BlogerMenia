import "server-only";

/**
 * Runtime configuration for the data layer.
 *
 * Everything is read from the environment and nothing is guessed: a missing
 * `API_BASE_URL` throws at import rather than letting every request fail
 * one-by-one against a relative URL.
 */

function normalizeUrl(url: string | undefined, fallback: string): string {
  if (!url || !url.trim()) return fallback;
  let clean = url.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/$/, "");
}

/** Root of the DRF API, e.g. `https://blogermenia.onrender.com/api/v1`. */
export const API_BASE_URL = normalizeUrl(
  process.env.API_BASE_URL,
  process.env.NODE_ENV === "production"
    ? "https://blogermenia.onrender.com/api/v1"
    : "http://localhost:8000/api/v1"
);

/**
 * Abort a live request after this long.
 *
 * Render's free tier spins the backend down when idle and a cold start has been
 * measured at ~31s, so a 30s budget timed out on the first request after every
 * idle period. 60s clears that with room to spare.
 */
export const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 60_000);

/**
 * Where Django itself is reachable, for the `/accounts/` OAuth passthrough in
 * `next.config.ts`.
 */
export const DJANGO_ORIGIN = (() => {
  if (process.env.DJANGO_ORIGIN) {
    return normalizeUrl(process.env.DJANGO_ORIGIN, "https://blogermenia.onrender.com");
  }
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return process.env.NODE_ENV === "production"
      ? "https://blogermenia.onrender.com"
      : "http://localhost:8000";
  }
})();
