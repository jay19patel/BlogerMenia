/**
 * Injects a pre-rendered SVG string (a DiceBear avatar, or an Excalidraw export
 * embedded in a post) into the tree.
 *
 * The host `<span>` uses `display: contents`, so it adds no box of its own and
 * the SVG is laid out by the real container — the same result the Django
 * templates get from dropping the markup in with `|safe`. The markup is
 * generated locally by DiceBear or read from the static fixtures; nothing here
 * ever renders visitor-supplied HTML.
 */
export function RawSvg({ html, className }: { html: string; className?: string }) {
  return (
    <span
      className={className ?? "contents"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
