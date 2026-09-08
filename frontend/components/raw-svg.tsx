import DOMPurify, { type Config } from "isomorphic-dompurify";

/**
 * Injects an SVG string into the tree.
 *
 * Two sources reach this component and only one of them is trustworthy:
 * DiceBear avatars, which the backend generates itself, and `section.svgData`
 * — an Excalidraw export an author pasted in, stored verbatim, and served to
 * every reader. SVG carries script (`onload`, `<foreignObject>`, `<script>`),
 * so it is sanitised here as well as in the serializer that stored it. Neither
 * layer is sufficient alone: the serializer cannot protect rows written before
 * it existed, and this cannot protect a future consumer that renders the field
 * some other way.
 *
 * The host `<span>` uses `display: contents`, so it adds no box of its own and
 * the SVG is laid out by the real container.
 */

const SVG_CONFIG: Config = {
  USE_PROFILES: { svg: true, svgFilters: true },
  // `<foreignObject>` reintroduces arbitrary HTML inside an SVG, which is the
  // hole the svg profile is otherwise closing.
  FORBID_TAGS: ["foreignObject", "script", "style"],
  FORBID_ATTR: ["onload", "onerror", "onclick", "onmouseover"],
};

export function RawSvg({ html, className }: { html: string | null | undefined; className?: string }) {
  if (!html) return null;

  const clean = DOMPurify.sanitize(html, SVG_CONFIG);

  return (
    <span
      className={className ?? "contents"}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
