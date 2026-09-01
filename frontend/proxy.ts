import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection, standing in for Django's `LoginRequiredMixin`.
 *
 * This is an optimistic check: it only looks for the presence of the access
 * cookie, because the signing secret belongs to the auth backend and should not
 * be duplicated at the edge. The authoritative check is `getViewer()` inside the
 * page. Sending signed-out visitors to the login page here just saves them a
 * render of a page they cannot use.
 */

const ACCESS_COOKIE = "bm_access";

/** Paths a signed-out visitor is redirected away from. */
const PROTECTED_PATTERNS: RegExp[] = [
  /^\/blogs\/create\/?$/,
  /^\/blogs\/[^/]+\/(update|delete)\/?$/,
  /^\/playlists\/create\/?$/,
  /^\/playlists\/[^/]+\/(update|delete)\/?$/,
  /^\/profile\/[^/]+\/edit\/?$/,
  /^\/accounts\/email\/?$/,
  /^\/accounts\/password\/change\/?$/,
  /^\/accounts\/social\/connections\/?$/,
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  if (request.cookies.has(ACCESS_COOKIE)) return NextResponse.next();

  // allauth's own convention: bounce to login and come back afterwards.
  const loginUrl = new URL("/accounts/login/", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/blogs/:path*",
    "/playlists/:path*",
    "/profile/:path*",
    "/accounts/email",
    "/accounts/password/change",
    "/accounts/social/connections",
  ],
};
