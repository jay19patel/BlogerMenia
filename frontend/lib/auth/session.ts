import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { users } from "@/lib/api";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import type { Viewer } from "@/lib/types";

/**
 * Server-side session.
 *
 * The access token is read from an httpOnly cookie and exchanged for the
 * current user through `GET /users/me/`. Wrapped in React's `cache()` so a page
 * that asks several times in one render only calls the API once.
 *
 * Server Components cannot set cookies, so an expired access token simply reads
 * as signed-out here; `POST /api/auth/session` performs the refresh and writes
 * the new cookie, and the client calls it on mount.
 */

export async function readAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

export async function readRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  return users.getCurrentUser(await readAccessToken());
});

/** True when the request carries a usable session. */
export async function isAuthenticated(): Promise<boolean> {
  return (await getViewer()) !== null;
}
