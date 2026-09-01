import { NextResponse } from "next/server";

import { auth, users } from "@/lib/api";
import { ACCESS_COOKIE, accessCookieOptions } from "@/lib/auth/cookies";
import { readAccessToken, readRefreshToken } from "@/lib/auth/session";

/**
 * `GET /api/auth/session`
 *
 * Returns the signed-in user, refreshing a stale access token on the way if the
 * refresh cookie is still good. This is where the session self-heals: Server
 * Components cannot write cookies, so an expired access token reads as
 * signed-out until this handler mints a new one.
 */
export async function GET() {
  try {
    const accessToken = await readAccessToken();
    const viewer = await users.getCurrentUser(accessToken);
    if (viewer) return NextResponse.json({ user: viewer });

    const refreshToken = await readRefreshToken();
    if (!refreshToken) return NextResponse.json({ user: null });

    const refreshed = await auth.refreshAccessToken(refreshToken);
    const refreshedViewer = await users.getCurrentUser(refreshed.access);

    const response = NextResponse.json({ user: refreshedViewer });
    response.cookies.set(ACCESS_COOKIE, refreshed.access, accessCookieOptions);
    return response;
  } catch {
    // A revoked or malformed refresh token is not an error for the caller —
    // it simply means nobody is signed in.
    return NextResponse.json({ user: null });
  }
}
