import DOMPurify from "isomorphic-dompurify";
import { Marked } from "marked";

/**
 * Inline markdown for the prose fields of a post: `**bold**`, `*italic*`,
 * `` `code` ``, `~~strike~~` and `[text](url)`.
 *
 * Inline-only, deliberately. A post is already a list of typed blocks — the
 * section's own type decides whether it is a list, a table or a code fence — so
 * running the block grammar over its text would reinterpret prose that was
 * never markdown: a title like "1. The shape of the system" becomes an ordered
 * list, a `# comment` line becomes a heading.
 */
const marked = new Marked({
  gfm: true,
  // A single newline is a line break, the way `{{ value|linebreaks }}` treats it.
  breaks: true,
  async: false,
});

const BARE_AMPERSAND = /&(?!#?\w+;)/g;

function escapeHtml(value: string): string {
  return value.replace(BARE_AMPERSAND, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/*
 * Raw tags become visible text instead of passing through to the document.
 * Prose here says things like `<slug>` and `<T>`, which the reader has to see;
 * marked would emit them as elements and the sanitiser would then drop them,
 * silently swallowing the words.
 */
marked.use({ renderer: { html: (token) => escapeHtml(token.text) } });

/** Everything the inline grammar can legitimately produce, and nothing else. */
const ALLOWED_TAGS = ["a", "br", "code", "del", "em", "strong"];
const ALLOWED_ATTR = ["href", "title"];

/** Markdown-formatted `text` as sanitised inline HTML. */
export function renderInlineMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parseInline(text) as string, { ALLOWED_TAGS, ALLOWED_ATTR });
}

/** The same text as plain text, markers removed — for TOC entries, tab titles and metadata. */
export function stripInlineMarkdown(text: string): string {
  const withoutBreaks = (marked.parseInline(text) as string).replace(/<br\s*\/?>/gi, " ");
  return DOMPurify.sanitize(withoutBreaks, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
