import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogEditor } from "@/components/blog-editor";
import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { blogs as blogsApi, misc, playlists as playlistsApi } from "@/lib/api";
import { urls } from "@/lib/urls";

/** Django: `/blogs/<slug>/update/` → `BlogUpdateView` → `blog/blog_form.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Edit Blog — Inkwell",
};

export async function generateStaticParams() {
  return (await blogsApi.listAllBlogSlugs()).map((slug) => ({ slug }));
}

export default async function BlogUpdatePage({ params }: PageProps<"/blogs/[slug]/update">) {
  const [blog, categories, playlistPage] = await Promise.all([
    blogsApi.getBlog((await params).slug),
    misc.listCategories(),
    playlistsApi.listPlaylists({ pageSize: 1000 }),
  ]);
  if (!blog) notFound();

  return (
    <>
      <PageHeader />
      <SiteSidebar active="write" />

      <main className="pt-16 lg:pl-64">
        <div className="w-full max-w-7xl px-6 sm:px-12 py-12">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
            <Link href={urls.home()} className="hover:text-slate-600 transition-colors">
              Blogs
            </Link>
            <span>/</span>
            <span>Edit</span>
          </div>

          <BlogEditor
            categories={categories.map((category) => category.name)}
            playlists={playlistPage.playlists.map((playlist) => ({
              id: playlist.id,
              title: playlist.title,
              author_username: playlist.author.username,
            }))}
            initial={{
              slug: blog.slug,
              title: blog.title,
              subtitle: blog.subtitle,
              excerpt: blog.excerpt,
              introduction: blog.introduction,
              conclusion: blog.conclusion,
              category_name: blog.category?.name ?? "",
              tags: blog.tags,
              is_published: blog.is_published,
              featured: blog.featured,
              posted_on_linkedin: blog.posted_on_linkedin,
              image_name: blog.image,
              sections: blog.sections,
              playlist_ids: blog.playlists.map((playlist) => playlist.id),
            }}
            isEdit
          />
        </div>
      </main>
    </>
  );
}
