import DOMPurify from "isomorphic-dompurify";

import { firstOf, stripTags, truncateWords } from "@/lib/format";
import type { Blog } from "@/lib/types";

/**
 * `{% firstof blog.excerpt blog.subtitle blog.content|striptags|truncatewords:N %}`
 *
 * The listing templates all use this ladder, only varying the word count of the
 * legacy-content fallback.
 */
export function blogSummary(blog: Blog, words: number): string {
  return firstOf(blog.excerpt, blog.subtitle, truncateWords(stripTags(blog.content), words));
}

/** True when the post uses the structured editor rather than the legacy body. */
export function isStructured(blog: Blog): boolean {
  return Boolean(blog.sections.length || blog.introduction || blog.conclusion);
}

/** One entry of the article's "ON THIS PAGE" rail. */
export interface TocEntry {
  id: string;
  text: string;
}

const H2_OPEN = /<h2(\s[^>]*)?>/gi;

/**
 * Sanitises a legacy post's HTML body and gives every `<h2>` a stable id, so the
 * table of contents can link into it.
 */
export function renderLegacyContent(html: string): { html: string; headings: TocEntry[] } {
  const clean = DOMPurify.sanitize(html);
  const headings: TocEntry[] = [];

  let index = 0;
  const withIds = clean.replace(H2_OPEN, (match, attributes: string | undefined) => {
    if (attributes && /\sid=/i.test(attributes)) return match;
    return `<h2${attributes ?? ""} id="legacy-heading-${index++}">`;
  });

  const texts = clean.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi) ?? [];
  texts.forEach((heading, position) => {
    headings.push({ id: `legacy-heading-${position}`, text: stripTags(heading).trim() });
  });

  return { html: withIds, headings };
}

/**
 * The headings the article body will render, matching the ids `BlogBody` emits.
 *
 * The original builds this in the browser by walking the rendered `<h2>`s and
 * assigning `section-<n>` to any without an id — which can collide when some
 * sections are untitled. Deriving it from the data keeps every anchor unique.
 */
export function buildToc(blog: Blog): TocEntry[] {
  if (!isStructured(blog)) return renderLegacyContent(blog.content).headings;

  const entries: TocEntry[] = blog.sections
    .map((section, index) => ({ id: `section-${index}`, text: section.title ?? "" }))
    .filter((entry) => entry.text !== "");

  if (blog.conclusion) entries.push({ id: "section-conclusion", text: "Conclusion" });

  return entries;
}
