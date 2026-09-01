import type { Metadata } from "next";
import Link from "next/link";

import { BlogEditor } from "@/components/blog-editor";
import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { misc, playlists as playlistsApi } from "@/lib/api";
import { urls } from "@/lib/urls";

/** Django: `/blogs/create/` → `BlogCreateView` → `blog/blog_form.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "New Blog — Inkwell",
};

export default async function BlogCreatePage() {
  const [categories, playlistPage] = await Promise.all([
    misc.listCategories(),
    playlistsApi.listPlaylists({ pageSize: 1000 }),
  ]);

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
            <span>New Post</span>
          </div>

          <BlogEditor
            categories={categories.map((category) => category.name)}
            playlists={playlistPage.playlists.map((playlist) => ({
              id: playlist.id,
              title: playlist.title,
              author_username: playlist.author.username,
            }))}
            initial={null}
            isEdit={false}
          />
        </div>
      </main>
    </>
  );
}
