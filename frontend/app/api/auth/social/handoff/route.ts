import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/api";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from "@/lib/auth/cookies";
import { urls } from "@/lib/urls";

/**
 * `GET /api/auth/social/handoff`
 *
 * Where Django sends the browser once the LinkedIn dance is done. The redirect
 * carries a single-use code rather than the tokens themselves — see
 * `accounts/services/social_handoff.py` — so this handler redeems it from the
 * server and writes the same httpOnly cookies `POST /api/auth/login` does.
 *
 * A GET that mutates the session is unusual, but this is the one place it has
 * to be: the caller is a browser following a 302 from an external provider, and
 * that cannot be a POST. The code is the credential, it expires in a minute,
 * and it is single-use, so a replayed or leaked URL buys nothing.
 */

/**
 * Only ever redirect somewhere inside this app. `next` reaches us through a
 * provider redirect, which makes it attacker-influenced: without this an
 * absolute or protocol-relative value would turn the handler into an open
 * redirect that arrives carrying a freshly minted session.
 */
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return urls.home();
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL(`${urls.accountLogin()}?error=social`, request.nextUrl));
  }

  try {
    const tokens = await auth.exchangeSocialHandoffCode(code);

    const response = NextResponse.redirect(new URL(next, request.nextUrl));
    response.cookies.set(ACCESS_COOKIE, tokens.access, accessCookieOptions);
    response.cookies.set(REFRESH_COOKIE, tokens.refresh, refreshCookieOptions);
    return response;
  } catch (error) {
    // An expired or already-redeemed code is a dead end, not a crash: send
    // them back to sign in rather than showing an error page with a token in
    // the URL bar.
    console.error("Social handoff exchange failed:", error);
    return NextResponse.redirect(new URL(`${urls.accountLogin()}?error=social`, request.nextUrl));
  }
}
