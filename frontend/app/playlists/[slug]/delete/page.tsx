import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteConfirmForm } from "@/components/delete-confirm-form";
import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { TrashBadge } from "@/components/trash-icon";
import { playlists as playlistsApi } from "@/lib/api";
import { urls } from "@/lib/urls";

/** Django: `/playlists/<slug>/delete/` → `PlaylistDeleteView` → `blog/playlist_confirm_delete.html` */

export async function generateStaticParams() {
  return (await playlistsApi.listAllPlaylistSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/playlists/[slug]/delete">): Promise<Metadata> {
  const playlist = await playlistsApi.getPlaylist((await params).slug);
  return {
    title: playlist ? `Delete "${playlist.title}" — Inkwell` : "Page not found — Inkwell",
    robots: { index: false, follow: false },
  };
}

export default async function PlaylistDeletePage({ params }: PageProps<"/playlists/[slug]/delete">) {
  const playlist = await playlistsApi.getPlaylist((await params).slug);
  if (!playlist) notFound();

  return (
    <>
      <PageHeader />
      <SiteSidebar active="playlists" />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-md px-8 sm:px-14 py-24 mx-auto text-center">
          <TrashBadge />

          <h1 className="text-2xl font-extrabold tracking-tight mb-3">Delete this playlist?</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            You&apos;re about to delete{" "}
            <strong className="text-slate-900">&quot;{playlist.title}&quot;</strong>. The blogs inside it
            will <strong>not</strong> be deleted.
          </p>

          <DeleteConfirmForm
            cancelHref={urls.playlistDetail(playlist.slug)}
            successHref={urls.playlistList()}
          />
        </div>
      </main>
    </>
  );
}
