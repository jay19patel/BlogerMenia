import Link from "next/link";

import { BreadcrumbJsonLd } from "@/components/json-ld";
import { cn } from "@/lib/cn";

/**
 * The `Home / Section / Page` trail.
 *
 * Three pages each hand-rolled their own version of this and five more had
 * none, so the crumbs disagreed about whether the root was "Blogs" or "Home"
 * and only the article page emitted a `BreadcrumbList`. Worse, that article
 * page's structured data listed three levels while the visible trail showed
 * two — telling Google about a trail the reader could not see.
 *
 * One component now renders the trail and derives the structured data from the
 * same array, so the two cannot drift apart again.
 */

export interface Crumb {
  name: string;
  /** Omitted on the current page, which renders as plain text. */
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <>
      <BreadcrumbJsonLd items={items.filter((item) => item.href).map((item) => ({ name: item.name, path: item.href! }))} />

      {/* The base colour sits on the <nav> so a caller can restyle the trail
          for a dark surface via `className` and have tailwind-merge win. */}
      <nav aria-label="Breadcrumb" className={cn("mb-6 text-sm text-slate-400", className)}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center gap-x-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href ? (
                <Link href={item.href} className="transition-colors hover:text-slate-600">
                  {item.name}
                </Link>
              ) : (
                /* The current page: announced, but not a link to itself. */
                <span aria-current="page" className="truncate">
                  {item.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
