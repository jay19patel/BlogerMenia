import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BlogActions } from "@/components/blog-actions";
import { BlogBody } from "@/components/blog-body";
import { AuthorAvatar, MediaFrame } from "@/components/media";
import { AuthorBio } from "@/components/author-bio";
import { CategoryBadge } from "@/components/category-badge";
import { ReadingProgress } from "@/components/reading-progress";
import { ShareButtons } from "@/components/share-buttons";
import { PageContainer, PageShell } from "@/components/page-shell";
import { buildToc, readingMinutes } from "@/lib/blog";
import { blogs as blogsApi } from "@/lib/api";
import { firstOf, formatDate } from "@/lib/format";
import { ArticleJsonLd } from "@/components/json-ld";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/blogs/<slug>/` → `BlogDetailView` → `blog/blog_detail.html` */

export async function generateStaticParams() {
  return (await blogsApi.listAllBlogSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blogs/[slug]">): Promise<Metadata> {
  const blog = await blogsApi.getBlog((await params).slug);
  if (!blog) return { title: "Page not found — BlogerMenia" };

  return buildMetadata({
    title: `${blog.title} — BlogerMenia`,
    description: blog.excerpt || blog.subtitle || undefined,
    path: urls.blogDetail(blog.slug),
    image: blog.image,
    type: "article",
    publishedTime: blog.created_at,
    modifiedTime: blog.updated_at,
    authors: [blog.author.display_name],
    tags: blog.tags,
    // Drafts are reachable by direct link but must not be indexed.
    noIndex: !blog.is_published,
  });
}

export default async function BlogDetailPage({ params }: PageProps<"/blogs/[slug]">) {
  const { slug } = await params;
  const blog = await blogsApi.getBlog(slug);
  if (!blog) notFound();

  const relatedBlogs = await blogsApi.listRelatedBlogs(slug);
  const summary = firstOf(blog.excerpt, blog.subtitle);

  return (
    <>
      <ArticleJsonLd blog={blog} />
      <ReadingProgress targetId="article-body" />
      <PageShell active="blog_list" activeCategory={blog.category?.slug} toc={buildToc(blog)}>
        <PageContainer className="max-w-5xl">
          <Breadcrumbs
            items={[
              { name: "Home", href: urls.home() },
              { name: "Blogs", href: urls.blogList() },
              ...(blog.category
                ? [{ name: blog.category.name, href: urls.blogListByCategory(blog.category.slug) }]
                : []),
              { name: blog.title, href: urls.blogDetail(blog.slug) },
            ]}
          />

          <CategoryBadge category={blog.category} className="mb-5 inline-block" />

          {/* Title */}
          <h1 className="text-4xl sm:text-[46px] font-serif font-semibold tracking-tight leading-[1.15] text-slate-900 mb-5">
            {blog.title}
          </h1>

          {summary && <p className="text-xl text-slate-500 leading-relaxed mb-6">{summary}</p>}

          {/* Author bar + actions */}
          {/* Wraps below `sm`: the byline plus five action buttons does not
              fit a phone on one line. */}
          <div className="mb-10 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Link href={urls.userProfile(blog.author.username)} className="shrink-0">
              <AuthorAvatar user={blog.author} className="size-9" />
            </Link>
            <div>
              <p className="font-medium text-slate-800">
                <Link href={urls.userProfile(blog.author.username)} className="hover:text-brand-600 transition-colors">
                  {blog.author.display_name}
                </Link>
              </p>
              <p className="text-xs text-slate-400">
                {formatDate(blog.created_at, "M d, Y")} · {readingMinutes(blog)} min read ·{" "}
                {blog.read_count} reads · {blog.like_count} likes
              </p>
            </div>

            <BlogActions
              blogId={blog.id}
              slug={blog.slug}
              authorUsername={blog.author.username}
              authorHasLinkedIn={blog.author.has_linkedin_oauth}
              postedOnLinkedin={blog.posted_on_linkedin}
              linkedinPostUrl={blog.linkedin_post_url}
              baseLikeCount={blog.like_count}
            />
          </div>

          {/* Featured image */}
          {blog.image ? (
            <figure className="mb-10">
              {/* eslint-disable-next-line @next/next/no-img-element -- matches the original figure markup. */}
              <img src={blog.image} alt={blog.title} className="w-full h-72 sm:h-80 object-cover rounded-2xl" />
            </figure>
          ) : (
            <MediaFrame
              src={null}
              alt={blog.title}
              avatarSvg={blog.avatar_svg}
              className="mb-10 h-64 rounded-2xl sm:h-72"
            />
          )}

          {/* Article body */}
          <article id="article-body" className="article-body text-slate-700 text-[17px] leading-[1.85]">
            <BlogBody blog={blog} />
          </article>

          {/* Tags */}
          {blog.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-slate-100 pt-8">
              {blog.tags.map((tag) => (
                <Link
                  key={tag}
                  href={urls.blogListByTag(tag)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Playlists */}
          {blog.playlists.length > 0 && (
            <div
              className={`flex flex-wrap gap-2 ${
                blog.tags.length === 0 ? "mt-10 pt-8 border-t border-slate-100" : "mt-3"
              }`}
            >
              <span className="text-xs font-medium text-slate-400 mr-1 self-center">In playlists:</span>
              {blog.playlists.map((playlist) => (
                <Link
                  key={playlist.slug}
                  href={urls.playlistDetail(playlist.slug)}
                  className="text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1.5 transition-colors"
                >
                  {playlist.title}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-8">
            <ShareButtons title={blog.title} path={urls.blogDetail(blog.slug)} />
          </div>

          <AuthorBio author={blog.author} />

          {/* More like this */}
          {relatedBlogs.length > 0 && (
            <div className="pt-14 mt-4">
              <h2 className="text-xl font-bold tracking-tight mb-6">More like this</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {relatedBlogs.map((related) => (
                  <Link
                    key={related.slug}
                    href={urls.blogDetail(related.slug)}
                    className="group block rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden"
                  >
                    <MediaFrame src={related.image} alt={related.title} avatarSvg={related.avatar_svg} className="h-32" />
                    <div className="p-5">
                      <CategoryBadge category={related.category} fallback="BLOG" />
                      <h3 className="font-bold text-slate-900 text-base mt-3 group-hover:text-brand-700 transition-colors leading-snug">
                        {related.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                        <AuthorAvatar user={related.author} className="size-5" />
                        {related.author.display_name} · {formatDate(related.created_at, "M d")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </PageContainer>
      </PageShell>
    </>
  );
}
