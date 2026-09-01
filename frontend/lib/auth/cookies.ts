import "server-only";

/**
 * Token cookies.
 *
 * Both are httpOnly, so no script — ours or an injected one — can read a token.
 * `SameSite=Lax` means the browser will not attach them to cross-site POSTs,
 * which is what protects the mutating route handlers from CSRF.
 */

export const ACCESS_COOKIE = "bm_access";
export const REFRESH_COOKIE = "bm_refresh";

const isProduction = process.env.NODE_ENV === "production";

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
  maxAge: 60 * 15,
} as const;

export const refreshCookieOptions = {
  ...accessCookieOptions,
  maxAge: 60 * 60 * 24 * 7,
} as const;

/** Expire a cookie by setting it empty with a zero lifetime. */
export const clearedCookieOptions = { ...accessCookieOptions, maxAge: 0 } as const;
