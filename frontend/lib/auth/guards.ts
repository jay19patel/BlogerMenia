import "server-only";

import { headers } from "next/headers";

/**
 * Reject cross-site writes.
 *
 * `SameSite=Lax` already stops the browser attaching our cookies to a
 * cross-site POST; comparing `Origin` to `Host` is a second, independent check
 * that also covers clients which do not enforce SameSite.
 */
export async function isSameOrigin(): Promise<boolean> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (!origin) return true; // same-origin form posts and server-side calls omit it

  const host = headerList.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
