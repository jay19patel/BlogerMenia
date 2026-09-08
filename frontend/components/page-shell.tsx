import type { ReactNode } from "react";

import { MobileNav } from "@/components/mobile-nav";
import { SiteHeader } from "@/components/site-header";
import { SiteNav, type SidebarSection } from "@/components/site-nav";
import { misc } from "@/lib/api";
import type { TocEntry } from "@/lib/blog";
import { PageContainer } from "@/components/page-container";
import { cn } from "@/lib/cn";

/**
 * The chrome every content page sits in: `partials/header.html` plus
 * `partials/sidebar.html` plus the offset `<main>`.
 *
 * Those three were repeated verbatim on eighteen pages, which is how two of
 * them ended up with a `lg:pl-60` offset against a `w-64` rail and two others
 * with no active nav section at all. Fetching the categories once here also
 * means each page no longer triggers its own `listCategories()` call from
 * inside the sidebar.
 */
export async function PageShell({
  active,
  activeCategory,
  toc,
  className,
  children,
}: {
  active?: SidebarSection;
  activeCategory?: string;
  /** Article pages pass their headings; the nav renders them as its TOC. */
  toc?: TocEntry[];
  /** Extra classes for `<main>`, on top of the header and rail offsets. */
  className?: string;
  children: ReactNode;
}) {
  const categories = await misc.listCategories();
  const nav = <SiteNav categories={categories} active={active} activeCategory={activeCategory} toc={toc} />;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <SiteHeader mobileNav={<MobileNav>{nav}</MobileNav>} />

      <aside className="fixed top-16 bottom-0 left-0 hidden w-64 overflow-y-auto border-r border-slate-200 bg-white lg:block z-30">
        {nav}
      </aside>

      <main className={cn("pt-16 lg:pl-64 flex-1 flex flex-col", className)}>{children}</main>
    </div>
  );
}

// Re-exported so the pages that import it from here keep working.
export { PageContainer };
