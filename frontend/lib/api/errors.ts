/**
 * A normalised API failure.
 *
 * DRF reports errors in two shapes — `{"detail": "..."}` for auth and 404s, and
 * `{"field": ["..."], "non_field_errors": ["..."]}` for validation — so both are
 * flattened here into something a form or an error boundary can consume.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  /** The first message for a field, ready to hand to react-hook-form. */
  fieldError(name: string): string | undefined {
    return this.fieldErrors[name]?.[0];
  }
}

/** Turn a DRF error body into an `ApiError`. */
export function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;

    if (typeof record.detail === "string") return new ApiError(status, record.detail);

    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(record)) {
      if (Array.isArray(value)) fieldErrors[key] = value.map(String);
      else if (typeof value === "string") fieldErrors[key] = [value];
    }
    const first = fieldErrors.non_field_errors?.[0] ?? Object.values(fieldErrors)[0]?.[0];
    if (first) return new ApiError(status, first, fieldErrors);
  }

  return new ApiError(status, `Request failed with status ${status}.`);
}
