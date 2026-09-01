import "server-only";

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { ACCESS_TOKEN_TTL, MOCK_JWT_SECRET, REFRESH_TOKEN_TTL } from "@/lib/api/config";

/**
 * Stand-in for `rest_framework_simplejwt`.
 *
 * These are genuine HS256 JWTs with SimpleJWT's own claim names, so the token
 * handling in `lib/auth/` — expiry checks, refresh-on-401, the cookie plumbing
 * — is the real thing and needs no changes when Django starts issuing them.
 */

const secret = new TextEncoder().encode(MOCK_JWT_SECRET);

export interface AccessClaims extends JWTPayload {
  token_type: "access" | "refresh";
  user_id: number;
  username: string;
}

async function sign(claims: Omit<AccessClaims, "iat" | "exp">, ttl: string): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function issueTokenPair(user: { id: number; username: string }) {
  const [access, refresh] = await Promise.all([
    sign({ token_type: "access", user_id: user.id, username: user.username }, ACCESS_TOKEN_TTL),
    sign({ token_type: "refresh", user_id: user.id, username: user.username }, REFRESH_TOKEN_TTL),
  ]);
  return { access, refresh };
}

export async function issueAccessToken(user: { id: number; username: string }) {
  return sign({ token_type: "access", user_id: user.id, username: user.username }, ACCESS_TOKEN_TTL);
}

/** Returns the claims, or `null` when the token is absent, expired or forged. */
export async function verifyToken(token: string | null | undefined): Promise<AccessClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<AccessClaims>(token, secret);
    return payload;
  } catch {
    return null;
  }
}
