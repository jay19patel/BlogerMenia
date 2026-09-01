"use client";

import { useEffect, useState } from "react";

import type { TocEntry } from "@/lib/blog";
import { cn } from "@/lib/cn";

/**
 * The article's "ON THIS PAGE" rail.
 *
 * The original built this in the browser from the rendered `<h2>`s; the entries
 * are derived from the post itself and passed in, so the list is present in the
 * server-rendered HTML. The scroll-spy behaviour is unchanged: the heading
 * nearest the top of the viewport is highlighted.
 */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;

    const spy = () => {
      let current = entries[0]?.id ?? null;
      for (const entry of entries) {
        const heading = document.getElementById(entry.id);
        if (heading && heading.getBoundingClientRect().top < 120) current = entry.id;
      }
      setActiveId(current);
    };

    document.addEventListener("scroll", spy, { passive: true });
    spy();
    return () => document.removeEventListener("scroll", spy);
  }, [entries]);

  return (
    <ul className="toc flex flex-col gap-0.5">
      {entries.map((entry) => (
        <li key={entry.id}>
          <a
            href={`#${entry.id}`}
            className={cn(
              "toc-link flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900",
              activeId === entry.id && "active",
            )}
          >
            <span className="toc-dot h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
            <span className="truncate">{entry.text}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
