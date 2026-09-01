import type { Metadata } from "next";
import Link from "next/link";

import { IfAuthenticated } from "@/components/auth-gate";
import { BlogCard, FeaturedBlogCard } from "@/components/blog-card";
import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { blogs as blogsApi, misc } from "@/lib/api";
import { ItemListJsonLd } from "@/components/json-ld";
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
  const category = await findCategory(firstParam((await searchParams).category));
  return buildMetadata({
    title: `${category ? `${category.name} — ` : ""}All Articles — Inkwell`,
    description: category
      ? `Every article filed under ${category.name} on BlogerMenia.`
      : "Every article published on BlogerMenia, newest first.",
    path: category ? urls.blogListByCategory(category.slug) : urls.blogList(),
  });
}

export default async function BlogListPage({ searchParams }: PageProps<"/blogs">) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(firstParam(params.page) ?? "1", 10);

  const [allCategories, currentCategory] = await Promise.all([
    misc.listCategories(),
    findCategory(firstParam(params.category)),
  ]);

  const { blogs, page: pageNumber, totalPages } = await blogsApi.listBlogs({
    page: Number.isNaN(requestedPage) ? 1 : requestedPage,
    category: currentCategory?.slug,
  });

  const isPaginated = totalPages > 1;
  const categoryQuery = currentCategory ? `category=${currentCategory.slug}&` : "";

  return (
    <>
      <ItemListJsonLd
        name={currentCategory ? `${currentCategory.name} articles` : "Latest articles"}
        items={blogs.map((blog) => ({ title: blog.title, path: urls.blogDetail(blog.slug) }))}
      />
      <PageHeader />
      <SiteSidebar active="blog_list" activeCategory={currentCategory?.slug} />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-5xl px-8 sm:px-14 py-14">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-1.5">
                {currentCategory ? currentCategory.name.toUpperCase() : "ALL WRITING"}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {currentCategory ? currentCategory.name : "Latest Articles"}
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
            /* Empty state */
            <div className="text-center py-24 border border-dashed border-slate-200 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 mb-1">No articles yet</h3>
              <p className="text-slate-500 text-sm mb-6">
                {currentCategory
                  ? `No articles in ${currentCategory.name} yet.`
                  : "Be the first to write something."}
              </p>
              <IfAuthenticated>
                <Link href={urls.blogCreate()} className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
                  Write the first article
                </Link>
              </IfAuthenticated>
            </div>
          )}

          {/* Pagination */}
          {isPaginated && (
            <div className="mt-12 flex items-center justify-center gap-3">
              {pageNumber > 1 && (
                <Link
                  href={`?${categoryQuery}page=${pageNumber - 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="m12 5-7 7 7 7" />
                  </svg>
                  Previous
                </Link>
              )}
              <span className="text-sm text-slate-400 px-2 mono">
                {pageNumber} / {totalPages}
              </span>
              {pageNumber < totalPages && (
                <Link
                  href={`?${categoryQuery}page=${pageNumber + 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
