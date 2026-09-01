"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DetailSidebarAccount } from "@/components/sidebar-account";
import { urls } from "@/lib/urls";
import type { TocEntry } from "@/lib/blog";
import { cn } from "@/lib/cn";

/**
 * `partials/sidebar_detail.html` — the article-reading rail, including the
 * "ON THIS PAGE" table of contents.
 *
 * The original builds the list in the browser from the rendered `<h2>`s; the
 * entries here are derived from the post itself and passed in, so the rail is
 * present in the server-rendered HTML. The scroll-spy behaviour is unchanged:
 * the heading nearest the top of the viewport is highlighted. Like the original,
 * a post with fewer than two headings shows no TOC.
 */
const NO_ENTRIES: TocEntry[] = [];

export function DetailSidebar({ toc = NO_ENTRIES }: { toc?: TocEntry[] }) {
  const entries = toc.length >= 2 ? toc : NO_ENTRIES;
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
    <aside className="fixed top-16 left-0 bottom-0 w-64 border-r border-slate-200 bg-white overflow-y-auto hidden lg:block">
      <nav className="p-5 flex flex-col gap-6 h-full">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2 px-2">BROWSE</p>
          <ul className="flex flex-col gap-0.5">
            <li>
              <Link href={urls.home()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </Link>
            </li>
            <li>
              <Link href={urls.blogList()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                All Blogs
              </Link>
            </li>
            <li>
              <Link href={urls.playlistList()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15V6" />
                  <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path d="M12 12H3" />
                  <path d="M16 6H3" />
                  <path d="M12 18H3" />
                </svg>
                Playlists
              </Link>
            </li>
          </ul>
        </div>

        <div className={entries.length ? "" : "hidden"}>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2 px-2">ON THIS PAGE</p>
          <ul className="flex flex-col gap-0.5 toc">
            {entries.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className={cn(
                    "toc-link flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-sm transition-colors",
                    activeId === entry.id && "active",
                  )}
                >
                  <span className="toc-dot w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  <span className="truncate">{entry.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-0.5">
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2 px-2">ACCOUNT</p>
          <DetailSidebarAccount />
        </div>
      </nav>
    </aside>
  );
}
