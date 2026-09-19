import { sanitizeSvg } from "@/lib/sanitize";

/**
 * Injects an SVG string into the tree safely without heavy JSDOM dependencies.
 *
 * Two sources reach this component and only one of them is trustworthy:
 * DiceBear avatars, which the backend generates itself, and `section.svgData`
 * — an Excalidraw export an author pasted in, stored verbatim, and served to
 * every reader. SVG carries script (`onload`, `<foreignObject>`, `<script>`),
 * so it is sanitised here as well as in the serializer that stored it.
 *
 * The host `<span>` uses `display: contents`, so it adds no box of its own and
 * the SVG is laid out by the real container.
 */

export function RawSvg({ html, className }: { html: string | null | undefined; className?: string }) {
  if (!html) return null;

  const clean = sanitizeSvg(html);

  return (
    <span
      className={className ?? "contents"}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
