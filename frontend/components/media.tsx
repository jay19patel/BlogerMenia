import type { ReactNode } from "react";

import { RawSvg } from "@/components/raw-svg";
import { cn } from "@/lib/cn";
import type { User } from "@/lib/types";

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

/**
 * A `Media` inside its clipping box.
 *
 * The fallback avatar is an inline `<svg>`, so every cover in the app wrapped
 * `Media` in a div carrying `[&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover`
 * — fifteen copies of the same three selectors, and a few that had quietly
 * dropped `object-cover` and so rendered a stretched avatar. The box lives here
 * now; callers pass only what actually differs (size, radius, position).
 */
export function MediaFrame({
  src,
  alt,
  avatarSvg,
  className,
  imgClassName,
  children,
}: {
  src: string | null;
  alt: string;
  avatarSvg: string;
  className?: string;
  imgClassName?: string;
  /** Overlays positioned against the frame — the "Featured" and count pills. */
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-slate-100",
        "[&>svg]:h-full [&>svg]:w-full [&>svg]:object-cover",
        className,
      )}
    >
      <Media src={src} alt={alt} avatarSvg={avatarSvg} imgClassName={imgClassName} />
      {children}
    </div>
  );
}

/** The round author avatar used in every byline. Size comes from `className`. */
export function AuthorAvatar({
  user,
  className,
}: {
  user: Pick<User, "profile_picture" | "username" | "avatar_svg">;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-full [&>svg]:h-full [&>svg]:w-full", className)}>
      <Media src={user.profile_picture} alt={user.username} avatarSvg={user.avatar_svg} />
    </div>
  );
}
