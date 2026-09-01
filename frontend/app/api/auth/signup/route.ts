import { NextResponse } from "next/server";

import { auth, users } from "@/lib/api";
import { ACCESS_COOKIE, REFRESH_COOKIE, accessCookieOptions, refreshCookieOptions } from "@/lib/auth/cookies";
import { isSameOrigin } from "@/lib/auth/guards";
import { errorResponse, forbidden } from "@/lib/auth/route-helpers";
import { signupPayloadSchema } from "@/lib/api/schemas";

/**
 * `POST /api/auth/signup`
 *
 * `ACCOUNT_EMAIL_VERIFICATION` is "none" upstream, so a successful registration
 * signs the new account straight in.
 */
export async function POST(request: Request) {
  if (!(await isSameOrigin())) return forbidden();

  try {
    const parsed = signupPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { detail: "Could not create the account.", ...parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const tokens = await auth.register(parsed.data);
    const viewer = await users.getCurrentUser(tokens.access);

    const response = NextResponse.json({ user: viewer });
    response.cookies.set(ACCESS_COOKIE, tokens.access, accessCookieOptions);
    response.cookies.set(REFRESH_COOKIE, tokens.refresh, refreshCookieOptions);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
