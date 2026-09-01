import { createAvatar } from "@dicebear/core";
import { bigSmile, shapes } from "@dicebear/collection";

/**
 * Port of `blog.utils.generate_avatar`.
 *
 * The Django app renders DiceBear avatars server-side and drops the raw SVG
 * into the page, stretched to fill whatever container it lands in. These are
 * deterministic from the seed, so the same blog/user always gets the same art.
 */
const STYLES = {
  shapes,
  "big-smile": bigSmile,
} as const;

export type AvatarStyle = keyof typeof STYLES;

const cache = new Map<string, string>();

export function generateAvatar(seed: string, styleName: AvatarStyle = "shapes"): string {
  const cacheKey = `${styleName}:${seed}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const svg = createAvatar(STYLES[styleName], { seed: String(seed) }).toString();

  // Same rewrite the Python helper performs: make the SVG stretch to fully fill
  // its container (no crop, no gaps) so it fits any cover shape.
  const stretched = svg.replace(
    "<svg ",
    '<svg preserveAspectRatio="none" width="100%" height="100%" style="width:100%;height:100%;display:block" ',
  );

  cache.set(cacheKey, stretched);
  return stretched;
}
