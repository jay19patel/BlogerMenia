import { renderInlineMarkdown } from "@/lib/markdown";

/**
 * A one-line prose field — a bullet, a table cell, a caption — with its inline
 * markdown rendered. For multi-paragraph fields use `<Linebreaks>`, which keeps
 * the paragraph structure and applies the same formatting.
 */
export function InlineMarkdown({ text, className }: { text: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(text) }} />;
}
