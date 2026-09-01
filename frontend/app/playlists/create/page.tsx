import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PlaylistForm } from "@/components/playlist-form";
import { SiteSidebar } from "@/components/site-sidebar";
import { blogs as blogsApi } from "@/lib/api";
import { toPickerBlog } from "@/lib/picker";
import { urls } from "@/lib/urls";

/** Django: `/playlists/create/` → `PlaylistCreateView` → `blog/playlist_form.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "New Playlist — Inkwell",
};

export default async function PlaylistCreatePage() {
  const { blogs } = await blogsApi.listBlogs({ pageSize: 1000 });
  const pickerBlogs = blogs.map(toPickerBlog);

  return (
    <>
      <PageHeader />
      <SiteSidebar active="playlists" />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-6xl px-6 sm:px-10 py-10">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link href={urls.playlistList()} className="hover:text-slate-600 transition-colors">
              Playlists
            </Link>
            <span>/</span>
            <span>New</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-8">Create a playlist</h1>

          <PlaylistForm
            blogs={pickerBlogs}
            submitLabel="Create playlist"
            successHref={urls.playlistList()}
          />
        </div>
      </main>
    </>
  );
}
