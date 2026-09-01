import { NextResponse } from "next/server";

import { auth, users } from "@/lib/api";
import { ACCESS_COOKIE, REFRESH_COOKIE, accessCookieOptions, refreshCookieOptions } from "@/lib/auth/cookies";
import { isSameOrigin } from "@/lib/auth/guards";
import { errorResponse, forbidden } from "@/lib/auth/route-helpers";
import { loginPayloadSchema } from "@/lib/api/schemas";

/**
 * `POST /api/auth/login`
 *
 * Exchanges credentials for a SimpleJWT pair and stores both tokens in httpOnly
 * cookies. The browser receives the user object only — never a token.
 */
export async function POST(request: Request) {
  if (!(await isSameOrigin())) return forbidden();

  try {
    const parsed = loginPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { detail: "Invalid credentials.", ...parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const tokens = await auth.obtainTokenPair(parsed.data);
    const viewer = await users.getCurrentUser(tokens.access);

    const response = NextResponse.json({ user: viewer });
    response.cookies.set(ACCESS_COOKIE, tokens.access, accessCookieOptions);
    response.cookies.set(REFRESH_COOKIE, tokens.refresh, refreshCookieOptions);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
