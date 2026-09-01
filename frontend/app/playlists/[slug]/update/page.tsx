import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlaylistForm } from "@/components/playlist-form";
import { blogs as blogsApi, playlists as playlistsApi } from "@/lib/api";
import { toPickerBlog } from "@/lib/picker";
import { PageShell } from "@/components/page-shell";
import { urls } from "@/lib/urls";

/** Django: `/playlists/<slug>/update/` → `PlaylistUpdateView` → `blog/playlist_form.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Edit Playlist — BlogerMenia",
};

export async function generateStaticParams() {
  return (await playlistsApi.listAllPlaylistSlugs()).map((slug) => ({ slug }));
}

export default async function PlaylistUpdatePage({ params }: PageProps<"/playlists/[slug]/update">) {
  const [playlist, blogPage] = await Promise.all([
    playlistsApi.getPlaylist((await params).slug),
    blogsApi.listBlogs({ pageSize: 1000 }),
  ]);
  if (!playlist) notFound();

  const pickerBlogs = blogPage.blogs.map(toPickerBlog);

  return (
    <>
      <PageShell active="playlists">
        <div className="max-w-6xl px-6 sm:px-10 py-10">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link href={urls.playlistList()} className="hover:text-slate-600 transition-colors">
              Playlists
            </Link>
            <span>/</span>
            <span>Edit</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-8">Edit playlist</h1>

          <PlaylistForm
            blogs={pickerBlogs}
            initialTitle={playlist.title}
            initialDescription={playlist.description}
            initialImage={playlist.image}
            initialBlogIds={playlist.blogs.map((blog) => blog.id)}
            submitLabel="Save changes"
            successHref={urls.playlistDetail(playlist.slug)}
          />
        </div>
      </PageShell>
    </>
  );
}
