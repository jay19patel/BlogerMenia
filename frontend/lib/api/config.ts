import "server-only";

/**
 * Runtime configuration for the data layer. Everything is read from the
 * environment so the same build can point at fixtures or at a real backend.
 */

export type ApiMode = "mock" | "live";

/** `mock` resolves against `data/*.json`; `live` talks to Django REST Framework. */
export const API_MODE: ApiMode = process.env.API_MODE === "live" ? "live" : "mock";

/** Root of the DRF API, e.g. `https://api.blogermenia.dev/api`. Live mode only. */
export const API_BASE_URL = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");

/** Abort a live request after this long. */
export const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 10_000);

/**
 * Secret used to sign the stand-in JWTs the mock backend issues. In live mode
 * Django signs the tokens and this is unused.
 */
export const MOCK_JWT_SECRET = process.env.MOCK_JWT_SECRET ?? "blogermenia-dev-only-secret";

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL = "7d";

if (API_MODE === "live" && !API_BASE_URL) {
  throw new Error("API_MODE=live requires API_BASE_URL to be set (see .env.example).");
}
