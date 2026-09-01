import { NextResponse } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE, clearedCookieOptions } from "@/lib/auth/cookies";
import { isSameOrigin } from "@/lib/auth/guards";
import { forbidden } from "@/lib/auth/route-helpers";

/** `POST /api/auth/logout` — drops both token cookies. */
export async function POST() {
  if (!(await isSameOrigin())) return forbidden();

  const response = NextResponse.json({ user: null });
  response.cookies.set(ACCESS_COOKIE, "", clearedCookieOptions);
  response.cookies.set(REFRESH_COOKIE, "", clearedCookieOptions);
  return response;
}
