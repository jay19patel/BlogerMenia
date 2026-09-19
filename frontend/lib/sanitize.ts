import sanitizeHtmlLib from "sanitize-html";

/**
 * Universal HTML and SVG sanitizer using lightweight, native-safe `sanitize-html`.
 * This avoids heavy headless browser dependencies (like JSDOM) in serverless SSR.
 */

const INLINE_ALLOWED_TAGS = ["a", "br", "code", "del", "em", "strong"];
const INLINE_ALLOWED_ATTR = {
  a: ["href", "title", "target", "rel"],
};

export function sanitizeInlineHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtmlLib(html, {
    allowedTags: INLINE_ALLOWED_TAGS,
    allowedAttributes: INLINE_ALLOWED_ATTR,
  });
}

export function stripHtmlTags(html: string): string {
  if (!html) return "";
  return sanitizeHtmlLib(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export function sanitizeContent(html: string): string {
  if (!html) return "";
  return sanitizeHtmlLib(html, {
    allowedTags: sanitizeHtmlLib.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "h4", "h5", "h6"]),
    allowedAttributes: {
      ...sanitizeHtmlLib.defaults.allowedAttributes,
      img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
      "*": ["id", "class", "style"],
    },
  });
}

const SVG_ALLOWED_TAGS = [
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "clipPath",
  "mask",
  "pattern",
  "image",
  "linearGradient",
  "radialGradient",
  "stop",
  "use",
  "symbol",
  "desc",
  "title",
];

export function sanitizeSvg(svg: string): string {
  if (!svg) return "";
  return sanitizeHtmlLib(svg, {
    allowedTags: SVG_ALLOWED_TAGS,
    allowedAttributes: {
      "*": [
        "id",
        "class",
        "viewBox",
        "xmlns",
        "xmlns:xlink",
        "width",
        "height",
        "x",
        "y",
        "x1",
        "y1",
        "x2",
        "y2",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "d",
        "fill",
        "fill-opacity",
        "fill-rule",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "stroke-dasharray",
        "stroke-dashoffset",
        "stroke-opacity",
        "transform",
        "opacity",
        "font-size",
        "font-family",
        "font-weight",
        "text-anchor",
        "dominant-baseline",
        "clip-path",
        "mask",
        "filter",
        "points",
        "offset",
        "stop-color",
        "stop-opacity",
        "href",
        "xlink:href",
      ],
    },
    allowedSchemes: ["http", "https", "data"],
    disallowedTagsMode: "discard",
  });
}
