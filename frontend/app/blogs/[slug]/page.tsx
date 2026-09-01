import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogActions } from "@/components/blog-actions";
import { BlogBody } from "@/components/blog-body";
import { DetailSidebar } from "@/components/detail-sidebar";
import { Media } from "@/components/media";
import { PageHeader } from "@/components/page-header";
import { buildToc } from "@/lib/blog";
import { blogs as blogsApi } from "@/lib/api";
import { firstOf, formatDate } from "@/lib/format";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/json-ld";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/blogs/<slug>/` → `BlogDetailView` → `blog/blog_detail.html` */

export async function generateStaticParams() {
  return (await blogsApi.listAllBlogSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blogs/[slug]">): Promise<Metadata> {
  const blog = await blogsApi.getBlog((await params).slug);
  if (!blog) return { title: "Page not found — Inkwell" };

  return buildMetadata({
    title: `${blog.title} — Inkwell`,
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
      <BreadcrumbJsonLd
        items={[
          { name: "Blogs", path: urls.home() },
          blog.category
            ? { name: blog.category.name, path: urls.blogListByCategory(blog.category.slug) }
            : { name: "All Articles", path: urls.blogList() },
          { name: blog.title, path: urls.blogDetail(blog.slug) },
        ]}
      />
      <PageHeader />
      <DetailSidebar toc={buildToc(blog)} />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-5xl px-8 sm:px-14 py-14">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <Link href={urls.home()} className="hover:text-slate-600 transition-colors">
              Blogs
            </Link>
            <span>/</span>
            {blog.category ? (
              <Link href={urls.blogListByCategory(blog.category.slug)} className="hover:text-slate-600 transition-colors">
                {blog.category.name}
              </Link>
            ) : (
              <Link href={urls.blogList()} className="hover:text-slate-600 transition-colors">
                All Articles
              </Link>
            )}
          </div>

          {/* Category badge */}
          {blog.category ? (
            <span className={`inline-block text-[11px] font-bold tracking-wide ${blog.category.text_class} ${blog.category.bg_class} rounded-full px-2.5 py-1 mb-5 uppercase`}>
              {blog.category.name}
            </span>
          ) : (
            <span className="inline-block text-[11px] font-bold tracking-wide text-blue-600 bg-blue-50 rounded-full px-2.5 py-1 mb-5">
              ARTICLE
            </span>
          )}

          {/* Title */}
          <h1 className="text-4xl sm:text-[46px] font-serif font-semibold tracking-tight leading-[1.15] text-slate-900 mb-5">
            {blog.title}
          </h1>

          {summary && <p className="text-xl text-slate-500 leading-relaxed mb-6">{summary}</p>}

          {/* Author bar + actions */}
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-10">
            <Link href={urls.userProfile(blog.author.username)}>
              {blog.author.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element -- matches the original byline markup.
                <img
                  src={blog.author.profile_picture}
                  alt={blog.author.username}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full overflow-hidden [&>svg]:w-full [&>svg]:h-full">
                  <Media src={null} alt={blog.author.username} avatarSvg={blog.author.avatar_svg} />
                </div>
              )}
            </Link>
            <div>
              <p className="font-medium text-slate-800">
                <Link href={urls.userProfile(blog.author.username)} className="hover:text-brand-600 transition-colors">
                  {blog.author.display_name}
                </Link>
              </p>
              <p className="text-xs text-slate-400">
                {formatDate(blog.created_at, "M d, Y")} · {blog.read_count} reads · {blog.like_count} likes
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
            <div className="h-64 sm:h-72 rounded-2xl overflow-hidden mb-10 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover bg-slate-100">
              <Media src={null} alt={blog.title} avatarSvg={blog.avatar_svg} />
            </div>
          )}

          {/* Article body */}
          <article id="article-body" className="article-body text-slate-700 text-[17px] leading-[1.85]">
            <BlogBody blog={blog} />
          </article>

          {/* Tags */}
          {blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-slate-100">
              {blog.tags.map((tag) => (
                <span key={tag} className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-3 py-1.5">
                  #{tag}
                </span>
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
                    <div className="h-32 overflow-hidden bg-slate-100 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover">
                      <Media src={related.image} alt={related.title} avatarSvg={related.avatar_svg} />
                    </div>
                    <div className="p-5">
                      {related.category ? (
                        <span className={`text-[11px] font-bold tracking-wide ${related.category.text_class} ${related.category.bg_class} rounded-full px-2.5 py-1 uppercase`}>
                          {related.category.name}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold tracking-wide text-blue-600 bg-blue-50 rounded-full px-2.5 py-1">
                          BLOG
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 text-base mt-3 group-hover:text-brand-700 transition-colors leading-snug">
                        {related.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden [&>svg]:w-full [&>svg]:h-full">
                          <Media
                            src={related.author.profile_picture}
                            alt={related.author.username}
                            avatarSvg={related.author.avatar_svg}
                          />
                        </div>
                        {related.author.display_name} · {formatDate(related.created_at, "M d")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
