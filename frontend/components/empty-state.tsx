import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The "nothing here yet" panel.
 *
 * Five pages each had their own version — dashed border or solid, `py-16`,
 * `py-20` or `py-24`, icon tile or bare glyph. One component with a `variant`
 * covers both looks the designs actually used.
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
  variant = "dashed",
  className,
}: {
  icon?: ReactNode;
  title?: string;
  message: string;
  action?: ReactNode;
  /** `dashed` for a list's empty page, `plain` for an empty tab panel. */
  variant?: "dashed" | "plain";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-6 py-16 text-center sm:py-20",
        variant === "dashed" && "rounded-2xl border border-dashed border-slate-200",
        className,
      )}
    >
      {icon && (
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      {title && <h3 className="mb-1 font-bold text-slate-900">{title}</h3>}
      <p className={cn("text-sm text-slate-500", action && "mb-5")}>{message}</p>
      {action}
    </div>
  );
}
