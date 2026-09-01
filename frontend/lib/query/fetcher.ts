"use client";

/**
 * The browser's only network client: a thin wrapper over the BFF route handlers
 * in `app/api/`. Cookies travel automatically, so nothing here touches tokens.
 */

export class HttpError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : null;

  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : `Request failed (${response.status}).`;
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(payload ?? {})) {
      if (key !== "detail" && Array.isArray(value)) fieldErrors[key] = value.map(String);
    }
    throw new HttpError(response.status, detail, fieldErrors);
  }

  return payload as T;
}
