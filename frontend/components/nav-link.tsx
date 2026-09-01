import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { cn } from "@/lib/cn";

/**
 * One row of the sidebar / drawer navigation.
 *
 * The active and idle styles used to be re-declared in four places, which is
 * how the detail rail ended up unable to show an active state at all. They live
 * here now, so every nav row in the app highlights identically.
 */

const ROW = "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors";
const ACTIVE = "bg-brand-50 text-brand-700";
const IDLE = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

/** Shared by the `<Link>` rows and the log-out `<button>`, so they match. */
export function navRowClass(isActive = false): string {
  return cn(ROW, isActive ? ACTIVE : IDLE);
}

export function NavLink({
  href,
  icon: Icon,
  isActive,
  children,
}: {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  isActive?: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <Link href={href} className={navRowClass(isActive)}>
        <Icon />
        {children}
      </Link>
    </li>
  );
}

/** The small uppercase caption above each nav group. */
export function NavHeading({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-slate-400">{children}</p>;
}
