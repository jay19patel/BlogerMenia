"""HTML and SVG sanitisation.

Blog bodies and Excalidraw diagrams are author-supplied markup that is rendered
verbatim into every reader's page. Sanitising on the way *in* means the stored
value is already safe, so a future consumer that forgets to escape cannot
reintroduce the hole. The frontend sanitises again on the way out; both layers
are cheap and neither is sufficient alone.
"""
import bleach

# Rich text allowed in the legacy `Blog.content` field.
HTML_TAGS = [
    "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote",
    "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td", "span", "div",
]
HTML_ATTRS = {
    "*": ["class", "id"],
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height", "loading"],
}

# Excalidraw exports. Deliberately no <script>, <foreignObject>, <a> or <style>:
# the first three execute, and <style> can pull in remote resources via @import.
# Losing <style> costs the diagram its embedded webfont, not its shape.
SVG_TAGS = [
    "svg", "g", "defs", "symbol", "use", "image", "title", "desc",
    "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
    "text", "tspan", "textPath",
    "linearGradient", "radialGradient", "stop", "clipPath", "mask", "pattern", "marker",
    "filter", "feGaussianBlur", "feOffset", "feBlend", "feColorMatrix", "feComposite",
    "feFlood", "feMerge", "feMergeNode", "feDropShadow",
]
SVG_ATTRS = {
    "*": [
        "id", "class", "style", "transform", "opacity", "fill", "fill-opacity", "fill-rule",
        "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin",
        "stroke-dasharray", "stroke-dashoffset", "clip-path", "mask", "filter",
        "font-family", "font-size", "font-weight", "font-style", "text-anchor",
        "dominant-baseline", "letter-spacing", "x", "y", "dx", "dy", "width", "height",
    ],
    "svg": ["viewBox", "xmlns", "xmlns:xlink", "version", "preserveAspectRatio", "role", "aria-label"],
    "path": ["d", "pathLength"],
    "circle": ["cx", "cy", "r"],
    "ellipse": ["cx", "cy", "rx", "ry"],
    "rect": ["rx", "ry"],
    "line": ["x1", "y1", "x2", "y2"],
    "polyline": ["points"],
    "polygon": ["points"],
    "use": ["href", "xlink:href"],
    "image": ["href", "xlink:href", "preserveAspectRatio"],
    "linearGradient": ["x1", "y1", "x2", "y2", "gradientUnits", "gradientTransform"],
    "radialGradient": ["cx", "cy", "r", "fx", "fy", "gradientUnits", "gradientTransform"],
    "stop": ["offset", "stop-color", "stop-opacity"],
    "marker": ["markerWidth", "markerHeight", "refX", "refY", "orient", "markerUnits"],
    "pattern": ["patternUnits", "patternContentUnits", "viewBox"],
    "mask": ["maskUnits", "maskContentUnits"],
    "clipPath": ["clipPathUnits"],
    "filter": ["filterUnits", "primitiveUnits"],
    "textPath": ["href", "xlink:href", "startOffset"],
}

# `data:` is how Excalidraw embeds raster images; `javascript:` is not in the
# list, which is the whole point.
PROTOCOLS = ["http", "https", "data", "mailto"]


def clean_html(value: str) -> str:
    """Sanitise a rich-text blog body. Returns '' for anything falsy."""
    if not value:
        return ""
    return bleach.clean(
        value,
        tags=set(HTML_TAGS),
        attributes=HTML_ATTRS,
        protocols=PROTOCOLS,
        strip=True,
        strip_comments=True,
    )


def clean_svg(value: str) -> str:
    """Sanitise an inline SVG document. Returns '' for anything falsy."""
    if not value:
        return ""
    return bleach.clean(
        value,
        tags=set(SVG_TAGS),
        attributes=SVG_ATTRS,
        protocols=PROTOCOLS,
        strip=True,
        strip_comments=True,
    )


def clean_text(value: str) -> str:
    """Strip every tag. For fields that are prose, never markup."""
    if not value:
        return ""
    return bleach.clean(value, tags=set(), attributes={}, strip=True, strip_comments=True)
