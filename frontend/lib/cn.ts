import { clsx, type ClassValue } from "clsx";

import { cx } from "@/utils/cx";

/**
 * Compose Tailwind class names.
 *
 * Beyond readability this avoids a real hazard: Tailwind v4's scanner reads
 * class names out of the source as plain text, so a name glued to an
 * interpolation (`` `pb-12${cond ? "" : " hidden"}` ``) is never seen and its
 * CSS is silently never generated. Passing complete strings to `cn()` keeps
 * every candidate visible to the scanner.
 *
 * Merging is delegated to `utils/cx`, the `tailwind-merge` instance Untitled UI
 * ships, so this project and the vendored components resolve class conflicts
 * with one shared configuration.
 */
export function cn(...inputs: ClassValue[]): string {
  return cx(clsx(inputs));
}
