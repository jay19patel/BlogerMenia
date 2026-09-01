import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { HttpError } from "@/lib/query/fetcher";

/**
 * Move DRF's field errors onto a react-hook-form instance.
 *
 * Django replies with `{"field": ["message"], "non_field_errors": ["…"]}`;
 * anything that does not name a known field lands on `fallbackField` so it is
 * still shown rather than swallowed.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fallbackField: Path<T>,
): void {
  if (!(error instanceof HttpError)) {
    setError(fallbackField, { type: "server", message: "Something went wrong. Please try again." });
    return;
  }

  const entries = Object.entries(error.fieldErrors);
  if (entries.length === 0) {
    setError(fallbackField, { type: "server", message: error.message });
    return;
  }

  for (const [field, messages] of entries) {
    setError(field as Path<T>, { type: "server", message: messages[0] });
  }
}
