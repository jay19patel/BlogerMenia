/**
 * Ports of the Django template filters the templates rely on.
 *
 * Dates are formatted from explicit UTC components rather than `toLocaleString`
 * so the server and the browser always produce the same string — the original
 * renders once, on the server, and we must not drift from it on hydration.
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * `{{ value|date:"<format>" }}` for the four format strings the templates use.
 *
 * - `M d, Y` → `Aug 24, 2026`
 * - `M d`    → `Aug 24`
 * - `M Y`    → `Aug 2026`
 * - `F Y`    → `August 2026`
 * - `F d, Y` → `August 24, 2026`
 */
export function formatDate(iso: string, format: "M d, Y" | "M d" | "M Y" | "F Y" | "F d, Y"): string {
  const date = new Date(iso);
  const month = MONTHS_SHORT[date.getUTCMonth()];
  const monthLong = MONTHS_LONG[date.getUTCMonth()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();

  switch (format) {
    case "M d, Y":
      return `${month} ${day}, ${year}`;
    case "M d":
      return `${month} ${day}`;
    case "M Y":
      return `${month} ${year}`;
    case "F Y":
      return `${monthLong} ${year}`;
    case "F d, Y":
      return `${monthLong} ${day}, ${year}`;
  }
}

/** `{% now "Y" %}` */
export function currentYear(): number {
  return new Date().getUTCFullYear();
}

/** `{{ value|striptags }}` */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/** `{{ value|truncatewords:count }}` — Django appends a single ellipsis char. */
export function truncateWords(text: string, count: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= count) return words.join(" ");
  return `${words.slice(0, count).join(" ")}…`;
}

/** `{{ value|pluralize }}` / `{{ value|pluralize:"S" }}` */
export function pluralize(count: number, suffix = "s"): string {
  return count === 1 ? "" : suffix;
}

/** `{% firstof a b c %}` — the first argument that is truthy after trimming. */
export function firstOf(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value && value.trim()) return value;
  }
  return "";
}

/**
 * Splits text the way `{{ value|linebreaks }}` does: blank lines separate
 * paragraphs, single newlines become line breaks within a paragraph.
 */
export function splitParagraphs(text: string): string[][] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.split("\n"))
    .filter((lines) => lines.some((line) => line.trim() !== ""));
}
