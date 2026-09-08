import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The page gutter, shared by every content page and by the error and loading
 * boundaries.
 *
 * Lives apart from `PageShell` deliberately: that component fetches the
 * category list, so a Client Component (a route `error.tsx`) importing the
 * container from there would pull the server-only data layer into the browser
 * bundle and fail the build.
 *
 * The pages each carried `px-8 sm:px-14`, and 32px of gutter on a 375px screen
 * left the cards noticeably cramped. Only the sub-`sm` step changes — from
 * 640px up the padding is what it always was.
 */
export function PageContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-10 sm:px-14 sm:py-14 flex-1 flex flex-col", className)}>{children}</div>;
}
