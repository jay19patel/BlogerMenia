import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * One panel inside a settings page, matching the cards used across the site.
 *
 * Deliberately in its own module rather than beside `SettingsPage`: the client
 * components on those pages render these cards, and `SettingsPage` reaches the
 * data layer through `PageShell`. Sharing a file would drag `server-only` into
 * a client bundle — which is exactly what the guard in `lib/api` is there to
 * catch, and did.
 */
export function SettingsCard({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8", className)}
    >
      {title && <h2 className="font-bold text-slate-900">{title}</h2>}
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {(title || description) && <div className="mt-5" />}
      {children}
    </section>
  );
}
