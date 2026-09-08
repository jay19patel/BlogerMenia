import "server-only";

/**
 * Runtime configuration for the data layer.
 *
 * Everything is read from the environment and nothing is guessed: a missing
 * `API_BASE_URL` throws at import rather than letting every request fail
 * one-by-one against a relative URL.
 */

/** Root of the DRF API, e.g. `https://api.blogermenia.dev/api/v1`. */
export const API_BASE_URL = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");

/** Abort a live request after this long. */
export const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 10_000);

/**
 * Where Django itself is reachable, for the `/accounts/` OAuth passthrough in
 * `next.config.ts`. Defaults to `API_BASE_URL`'s origin so a deploy that sets
 * one variable does not silently keep proxying to localhost.
 */
export const DJANGO_ORIGIN =
  process.env.DJANGO_ORIGIN?.replace(/\/$/, "") ??
  (API_BASE_URL ? new URL(API_BASE_URL).origin : "http://127.0.0.1:8000");

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL must be set (see .env.example).");
}
