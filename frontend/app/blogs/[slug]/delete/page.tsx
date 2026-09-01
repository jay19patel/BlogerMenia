import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteConfirmForm } from "@/components/delete-confirm-form";
import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { TrashBadge } from "@/components/trash-icon";
import { blogs as blogsApi } from "@/lib/api";
import { urls } from "@/lib/urls";

/** Django: `/blogs/<slug>/delete/` → `BlogDeleteView` → `blog/blog_confirm_delete.html` */

export async function generateStaticParams() {
  return (await blogsApi.listAllBlogSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blogs/[slug]/delete">): Promise<Metadata> {
  const blog = await blogsApi.getBlog((await params).slug);
  return {
    title: blog ? `Delete "${blog.title}" — Inkwell` : "Page not found — Inkwell",
    robots: { index: false, follow: false },
  };
}

export default async function BlogDeletePage({ params }: PageProps<"/blogs/[slug]/delete">) {
  const blog = await blogsApi.getBlog((await params).slug);
  if (!blog) notFound();

  return (
    <>
      <PageHeader />
      <SiteSidebar />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-md px-8 sm:px-14 py-24 mx-auto text-center">
          <TrashBadge />

          <h1 className="text-2xl font-extrabold tracking-tight mb-3">Delete this post?</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            You&apos;re about to permanently delete{" "}
            <strong className="text-slate-900">&quot;{blog.title}&quot;</strong>. This cannot be undone.
          </p>

          <DeleteConfirmForm cancelHref={urls.blogDetail(blog.slug)} successHref={urls.blogList()} />
        </div>
      </main>
    </>
  );
}
