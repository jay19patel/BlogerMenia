import { RawSvg } from "@/components/raw-svg";

/**
 * The `{% if x.image %}<img>{% else %}{{ x.avatar_svg|safe }}{% endif %}` pair
 * that appears in every card, cover and byline in the Django templates.
 *
 * `avatarSvg` comes from the model's `avatar_svg` property, generated once
 * server-side, so no avatar code ships to the browser.
 */
export function Media({
  src,
  alt,
  avatarSvg,
  imgClassName = "w-full h-full object-cover",
}: {
  src: string | null;
  alt: string;
  avatarSvg: string;
  imgClassName?: string;
}) {
  if (src) {
    /* eslint-disable-next-line @next/next/no-img-element --
       a plain <img> keeps the markup byte-identical to the Django template. */
    return <img src={src} alt={alt} className={imgClassName} />;
  }
  return <RawSvg html={avatarSvg} />;
}
