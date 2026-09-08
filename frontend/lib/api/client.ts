import "server-only";

import type { ZodType } from "zod";

import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/api/config";
import { ApiError, toApiError } from "@/lib/api/errors";

/* ============================================================================
 *  THE ONLY FILE THAT TALKS TO DJANGO
 * ============================================================================
 *
 *  Everything above it — the resource modules, the React Query hooks, every
 *  page and component — is written against this client and never touches
 *  `fetch` itself.
 *
 *  Responses are validated against `lib/api/schemas.ts`, so a serializer that
 *  drifts from the contract fails loudly here rather than rendering blanks
 *  three components deep. The backend publishes the authoritative contract at
 *  `/api/schema/` (Swagger UI at `/api/docs/`) — check against it when a
 *  schema here needs changing.
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

async function httpRequest(options: RequestOptions): Promise<unknown> {
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
  const payload = await httpRequest(options);

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
  await httpRequest(options);
}
