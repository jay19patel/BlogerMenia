import "server-only";

import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { tokenPairSchema, tokenRefreshSchema, type LoginPayload } from "@/lib/api/schemas";

/**
 * `rest_framework_simplejwt` token endpoints.
 *
 * These are called only from the route handlers in `app/api/auth/`, which store
 * the resulting tokens in httpOnly cookies. No token is ever returned to the
 * browser's JavaScript.
 */

export async function obtainTokenPair(payload: LoginPayload) {
  return request(tokenPairSchema, { path: endpoints.token(), method: "POST", body: payload });
}

export async function refreshAccessToken(refresh: string) {
  return request(tokenRefreshSchema, { path: endpoints.tokenRefresh(), method: "POST", body: { refresh } });
}

export async function register(payload: { email: string; password1: string; password2: string }) {
  return request(tokenPairSchema, { path: endpoints.register(), method: "POST", body: payload });
}
