import { Fragment } from "react";

import { splitParagraphs } from "@/lib/format";

/**
 * `{{ value|linebreaks }}` — blank lines become paragraphs, single newlines
 * become `<br>`. Rendered as real elements rather than injected HTML, so the
 * text is escaped by React the way Django's autoescaping escapes it.
 */
export function Linebreaks({ text }: { text: string }) {
  return (
    <>
      {splitParagraphs(text).map((lines, paragraphIndex) => (
        <p key={paragraphIndex}>
          {lines.map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}
