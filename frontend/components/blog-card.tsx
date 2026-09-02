import Link from "next/link";

import { LinkedInPostedBadge } from "@/components/icons";
import { AuthorAvatar, MediaFrame } from "@/components/media";
import { CategoryBadge } from "@/components/category-badge";
import { blogSummary, readingMinutes } from "@/lib/blog";
import { formatDate } from "@/lib/format";
import { urls } from "@/lib/urls";
import type { Blog } from "@/lib/types";

function HeartIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/** The large first card in `blog/blog_list.html` (`{% with blog=blogs.0 %}`). */
export function FeaturedBlogCard({ blog }: { blog: Blog }) {
  return (
    <Link
      href={urls.blogDetail(blog.slug)}
      className="group block rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60 transition-all overflow-hidden mb-8"
    >
      <div className="sm:flex">
        <MediaFrame
          src={blog.image}
          alt={blog.title}
          avatarSvg={blog.avatar_svg}
          className="relative h-52 sm:h-auto sm:w-64 sm:shrink-0"
        >
          <span className="absolute top-3 left-3 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Featured
          </span>
        </MediaFrame>

        <div className="flex-1 p-7 flex flex-col justify-between">
          <div>
            <CategoryBadge category={blog.category} />
            <h2 className="font-extrabold text-slate-900 text-xl sm:text-2xl mt-4 mb-3 group-hover:text-brand-700 transition-colors leading-snug">
              {blog.title}
              <LinkedInPostedBadge postedOnLinkedin={blog.posted_on_linkedin} linkedinPostUrl={blog.linkedin_post_url} />
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{blogSummary(blog, 40)}</p>
          </div>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
            <AuthorAvatar user={blog.author} className="size-7 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">{blog.author.display_name}</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">{formatDate(blog.created_at, "M d, Y")}</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">{readingMinutes(blog)} min read</span>
            <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
              <HeartIcon size={13} />
              {blog.like_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** The two-column grid card in `blog/blog_list.html`. */
export function BlogCard({ blog }: { blog: Blog }) {
  return (
    <Link
      href={urls.blogDetail(blog.slug)}
      className="group flex flex-col rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden"
    >
      <MediaFrame
        src={blog.image}
        alt={blog.title}
        avatarSvg={blog.avatar_svg}
        className="h-44 shrink-0"
      />

      <div className="flex flex-col flex-1 p-5">
        <CategoryBadge category={blog.category} className="mb-3 w-fit" />

        <h2 className="font-bold text-slate-900 text-[15px] leading-snug mb-2 group-hover:text-brand-700 transition-colors">
          {blog.title}
          <LinkedInPostedBadge postedOnLinkedin={blog.posted_on_linkedin} linkedinPostUrl={blog.linkedin_post_url} />
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 flex-1">{blogSummary(blog, 22)}</p>

        <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-slate-100">
          <AuthorAvatar user={blog.author} className="size-6 shrink-0" />
          <span className="text-xs text-slate-500 font-medium truncate">{blog.author.display_name}</span>
          <span className="text-slate-300 shrink-0">·</span>
          <span className="shrink-0 text-xs text-slate-400">{formatDate(blog.created_at, "M d")}</span>
          <span className="hidden shrink-0 text-slate-300 sm:inline">·</span>
          <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">{readingMinutes(blog)} min</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400 shrink-0">
            <HeartIcon size={12} />
            {blog.like_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
