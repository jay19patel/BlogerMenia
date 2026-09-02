import Link from "next/link";

import { LinkedInIcon } from "@/components/icons";
import { AuthorAvatar } from "@/components/media";
import { pluralize } from "@/lib/format";
import type { User } from "@/lib/types";
import { urls } from "@/lib/urls";

/**
 * The "about the author" panel at the end of an article.
 *
 * A reader who finished a post had no route to the person who wrote it beyond
 * the byline link at the very top of the page. This closes the article with
 * their bio, their output and a link to the rest of it.
 */
export function AuthorBio({ author }: { author: User }) {
  return (
    <aside className="mt-14 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
      <p className="mb-4 text-[11px] font-semibold tracking-wider text-slate-400">WRITTEN BY</p>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Link href={urls.userProfile(author.username)} className="shrink-0">
          <AuthorAvatar user={author} className="size-16 ring-2 ring-white" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={urls.userProfile(author.username)}
              className="font-bold text-slate-900 transition-colors hover:text-brand-600"
            >
              {author.display_name}
            </Link>
            {author.linkedin_url && (
              <a
                href={author.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                title="LinkedIn profile"
                className="shrink-0 text-[#0A66C2] transition-colors hover:text-[#004182]"
              >
                <LinkedInIcon className="size-4" />
              </a>
            )}
          </div>

          <p className="mt-0.5 text-xs text-slate-400">
            @{author.username} · {author.blog_count} article{pluralize(author.blog_count)}
          </p>

          {author.bio && <p className="mt-3 text-sm leading-relaxed text-slate-600">{author.bio}</p>}
        </div>

        <Link
          href={urls.userProfile(author.username)}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300"
        >
          View profile
        </Link>
      </div>
    </aside>
  );
}
