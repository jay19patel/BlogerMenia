import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogBody } from "@/components/blog-body";
import { blogs as blogsApi } from "@/lib/api";
import { formatDate } from "@/lib/format";

import { PrintMode } from "./print-mode";

/**
 * Django: `blog/pdf_template.html`, rendered by `GeneratePDFView` /
 * `DownloadPDFView` into a downloadable file.
 *
 * With no Celery worker to render it server-side, the same document is served
 * as a print-ready page and handed to the browser's own PDF export.
 */

export async function generateStaticParams() {
  return (await blogsApi.listAllBlogSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blogs/[slug]/pdf">): Promise<Metadata> {
  const blog = await blogsApi.getBlog((await params).slug);
  return {
    title: blog ? blog.title : "Page not found — Inkwell",
    robots: { index: false, follow: false },
  };
}

export default async function BlogPdfPage({ params }: PageProps<"/blogs/[slug]/pdf">) {
  const blog = await blogsApi.getBlog((await params).slug);
  if (!blog) notFound();

  return (
    <>
      <article className="pdf-document">
        <h1>{blog.title}</h1>

        <div className="meta">
          By {blog.author.display_name} &middot; {formatDate(blog.created_at, "F d, Y")}
        </div>

        {blog.image && (
          // eslint-disable-next-line @next/next/no-img-element -- matches the original PDF markup.
          <img src={blog.image} className="cover-image" alt="Cover Image" />
        )}

        <div className="content">
          <BlogBody blog={blog} variant="print" />
        </div>
      </article>
      <PrintMode />
    </>
  );
}
