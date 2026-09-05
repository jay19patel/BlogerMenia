import "server-only";

import type { ZodType } from "zod";

import { API_BASE_URL, API_MODE, API_TIMEOUT_MS } from "@/lib/api/config";
import { ApiError, toApiError } from "@/lib/api/errors";
import { mockRequest } from "@/lib/api/mock/router";

/* ============================================================================
 *  THE SWAP POINT
 * ============================================================================
 *
 *  This is the only file that knows where data comes from. Everything above it
 *  — the resource modules, the React Query hooks, every page and component —
 *  is written against a real HTTP API and does not change when you go live.
 *
 *  ----------------------------------------------------------------------
 *  GOING LIVE AGAINST DJANGO REST FRAMEWORK
 *  ----------------------------------------------------------------------
 *
 *  1. Set two environment variables (see `.env.example`):
 *
 *         API_MODE=live
 *         API_BASE_URL=https://your-django-host/api
 *
 *     That is the whole switch. `liveRequest` below is already a complete
 *     DRF client: bearer auth, timeouts, DRF error shapes, 204 handling.
 *
 *  2. Delete `lib/api/mock/` and the `mockRequest` import above. Nothing else
 *     references it.
 *
 *  3. Make sure your DRF endpoints match `lib/api/endpoints.ts` and your
 *     serializers match `lib/api/schemas.ts`. Responses are validated against
 *     those schemas, so a mismatch fails loudly here rather than silently
 *     rendering blanks. Adjust whichever side you prefer.
 *
 *  4. Required DRF settings:
 *
 *         REST_FRAMEWORK = {
 *           "DEFAULT_AUTHENTICATION_CLASSES": [
 *             "rest_framework_simplejwt.authentication.JWTAuthentication",
 *           ],
 *           "DEFAULT_PAGINATION_CLASS":
 *             "rest_framework.pagination.PageNumberPagination",
 *           "PAGE_SIZE": 10,
 *         }
 *
 *  No CORS configuration is needed: the browser never calls Django directly.
 *  Requests originate from this Next.js server (Server Components and the
 *  route handlers in `app/api/`), which also holds the tokens in httpOnly
 *  cookies. See `lib/auth/session.ts`.
 * ========================================================================= */

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions {
  path: string;
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  /** Access token to send as `Authorization: Bearer …`. */
  token?: string | null;
  signal?: AbortSignal;
  /** Passed through to `fetch` in live mode for ISR / tag revalidation. */
  next?: { revalidate?: number | false; tags?: string[] };
}

function buildQuery(query: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

async function liveRequest(options: RequestOptions): Promise<unknown> {
  const { path, method = "GET", query, body, token, signal, next } = options;
  const url = `${API_BASE_URL}${path}${buildQuery(query)}`;

  const timeout = AbortSignal.timeout(API_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    const isFormData = body instanceof FormData;
    response = await fetch(url, {
      method,
      signal: combined,
      headers: {
        Accept: "application/json",
        ...(isFormData ? {} : body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: isFormData ? body : (body === undefined ? undefined : JSON.stringify(body)),
      ...(next ? { next } : {}),
    });
  } catch (cause) {
    const reason = cause instanceof Error && cause.name === "TimeoutError" ? "timed out" : "failed";
    throw new ApiError(503, `Request to ${path} ${reason}.`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : null;

  if (!response.ok) throw toApiError(response.status, payload);
  return payload;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Perform a request and validate the response against `schema`.
 *
 * Pass `null` as the schema for endpoints that return no body.
 */
export async function request<T>(schema: ZodType<T>, options: RequestOptions): Promise<T> {
  const payload = API_MODE === "live" ? await liveRequest(options) : await mockRequest(options);

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(
      502,
      `${options.method ?? "GET"} ${options.path} returned an unexpected shape: ` +
        `${issue.path.join(".") || "(root)"} — ${issue.message}`,
    );
  }
  return parsed.data;
}

/** A request whose response body is discarded. */
export async function requestVoid(options: RequestOptions): Promise<void> {
  if (API_MODE === "live") await liveRequest(options);
  else await mockRequest(options);
}
