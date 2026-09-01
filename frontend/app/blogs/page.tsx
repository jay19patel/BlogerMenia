import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BooksIcon } from "@/components/nav-icons";
import { IfAuthenticated } from "@/components/auth-gate";
import { BlogCard, FeaturedBlogCard } from "@/components/blog-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { blogs as blogsApi, misc } from "@/lib/api";
import { ItemListJsonLd } from "@/components/json-ld";
import { PageContainer, PageShell } from "@/components/page-shell";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/blogs/` → `blog.views.blog_views.BlogListView` → `blog/blog_list.html` */

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function findCategory(slug: string | undefined) {
  if (!slug) return null;
  return (await misc.listCategories()).find((category) => category.slug === slug) ?? null;
}

export async function generateMetadata({ searchParams }: PageProps<"/blogs">): Promise<Metadata> {
  const params = await searchParams;
  const category = await findCategory(firstParam(params.category));
  const tag = firstParam(params.tag);

  if (tag) {
    return buildMetadata({
      title: `#${tag} — BlogerMenia`,
      description: `Every article tagged #${tag} on BlogerMenia.`,
      path: urls.blogListByTag(tag),
    });
  }

  return buildMetadata({
    title: `${category ? `${category.name} — ` : ""}All Articles — BlogerMenia`,
    description: category
      ? `Every article filed under ${category.name} on BlogerMenia.`
      : "Every article published on BlogerMenia, newest first.",
    path: category ? urls.blogListByCategory(category.slug) : urls.blogList(),
  });
}

export default async function BlogListPage({ searchParams }: PageProps<"/blogs">) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(firstParam(params.page) ?? "1", 10);

  const currentTag = firstParam(params.tag);

  const [allCategories, currentCategory] = await Promise.all([
    misc.listCategories(),
    findCategory(firstParam(params.category)),
  ]);

  const { blogs, page: pageNumber, totalPages } = await blogsApi.listBlogs({
    page: Number.isNaN(requestedPage) ? 1 : requestedPage,
    category: currentCategory?.slug,
    tag: currentTag,
  });

  // Whatever filter is active has to survive a page change.
  const filterQuery = currentTag
    ? `tag=${encodeURIComponent(currentTag)}&`
    : currentCategory
      ? `category=${currentCategory.slug}&`
      : "";

  return (
    <>
      <ItemListJsonLd
        name={currentCategory ? `${currentCategory.name} articles` : "Latest articles"}
        items={blogs.map((blog) => ({ title: blog.title, path: urls.blogDetail(blog.slug) }))}
      />
      <PageShell active="blog_list" activeCategory={currentCategory?.slug}>
        <PageContainer className="max-w-5xl">
          <Breadcrumbs
            items={[
              { name: "Home", href: urls.home() },
              { name: "Blogs", href: urls.blogList() },
              ...(currentTag ? [{ name: `#${currentTag}`, href: urls.blogListByTag(currentTag) }] : []),
              ...(currentCategory
                ? [{ name: currentCategory.name, href: urls.blogListByCategory(currentCategory.slug) }]
                : []),
            ]}
          />

          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400">
                {currentTag ? "TAGGED" : currentCategory ? currentCategory.name.toUpperCase() : "ALL WRITING"}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {currentTag ? `#${currentTag}` : currentCategory ? currentCategory.name : "Latest Articles"}
              </h1>
            </div>
            <IfAuthenticated>
              <Link
                href={urls.blogCreate()}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Write
              </Link>
            </IfAuthenticated>
          </div>

          {/* An active tag is not one of the category pills, so it gets its own
              removable chip — otherwise the filter is invisible and unclearable. */}
          {currentTag && (
            <div className="mb-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
                #{currentTag}
                <Link href={urls.blogList()} aria-label={`Clear the ${currentTag} tag filter`} className="text-brand-500 transition-colors hover:text-brand-800">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </Link>
              </span>
            </div>
          )}

          {/* Category filter pills */}
          {allCategories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-10 pb-8 border-b border-slate-100">
              <Link
                href={urls.blogList()}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  currentCategory
                    ? "border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                    : "bg-slate-900 text-white border-slate-900"
                }`}
              >
                All
              </Link>
              {allCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={urls.blogListByCategory(category.slug)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                    currentCategory?.slug === category.slug
                      ? `${category.bg_class} ${category.text_class} border-current`
                      : "border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}

          {blogs.length > 0 ? (
            <>
              <FeaturedBlogCard blog={blogs[0]} />

              {blogs.length > 1 && (
                <div className="grid sm:grid-cols-2 gap-6">
                  {blogs.slice(1).map((blog) => (
                    <BlogCard key={blog.slug} blog={blog} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<BooksIcon className="size-7" strokeWidth={1.5} />}
              title="No articles yet"
              message={
                currentTag
                  ? `Nothing tagged #${currentTag} yet.`
                  : currentCategory
                    ? `No articles in ${currentCategory.name} yet.`
                    : "Be the first to write something."
              }
              action={
                <IfAuthenticated>
                  <Link href={urls.blogCreate()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                    Write the first article
                  </Link>
                </IfAuthenticated>
              }
            />
          )}

          <Pagination page={pageNumber} totalPages={totalPages} baseQuery={filterQuery} />
        </PageContainer>
      </PageShell>
    </>
  );
}
