import { splitParagraphs } from "@/lib/format";
import { renderInlineMarkdown } from "@/lib/markdown";

/**
 * `{{ value|linebreaks }}` — blank lines become paragraphs, single newlines
 * become `<br>`.
 *
 * Each paragraph also gets its inline markdown rendered (`**bold**`, `` `code` ``,
 * links), which is why the HTML is injected rather than built from elements:
 * the string comes back sanitised from `renderInlineMarkdown`, which escapes
 * everything the author did not mark up.
 */
export function Linebreaks({ text }: { text: string }) {
  return (
    <>
      {splitParagraphs(text).map((lines, paragraphIndex) => (
        <p key={paragraphIndex} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(lines.join("\n")) }} />
      ))}
    </>
  );
}
