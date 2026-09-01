"use client";

import { Fragment, type ReactNode } from "react";

import { useSession } from "@/components/session-provider";

/**
 * The "Saved Blogs" tab of `blog/profile.html`.
 *
 * Cards for every published post are rendered on the server and filtered here
 * by the visitor's saved set, so bookmarking from an article page is reflected
 * immediately — the behaviour `saved_blogs.add()` gave the original.
 */
export function SavedBlogsPanel({ cards }: { cards: { id: number; node: ReactNode }[] }) {
  const { user } = useSession();
  const savedIds = user?.saved_blog_ids ?? [];
  const saved = cards.filter((card) => savedIds.includes(card.id));

  if (saved.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-xs">
        <span className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-300">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </span>
        <p className="text-slate-500 font-medium">No saved blogs.</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {saved.map((card) => (
        <Fragment key={card.id}>{card.node}</Fragment>
      ))}
    </div>
  );
}
