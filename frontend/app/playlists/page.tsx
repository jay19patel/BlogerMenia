import type { Metadata } from "next";
import Link from "next/link";

import { IfAuthenticated } from "@/components/auth-gate";
import { Media } from "@/components/media";
import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { playlists as playlistsApi } from "@/lib/api";
import { formatDate, pluralize, truncateWords } from "@/lib/format";
import { ItemListJsonLd } from "@/components/json-ld";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/playlists/` → `PlaylistListView` → `blog/playlist_list.html` */

export const metadata: Metadata = buildMetadata({
  title: "Playlists — Inkwell",
  description: "Curated reading lists — stacks of articles grouped by a writer around one thread.",
  path: urls.playlistList(),
});

export default async function PlaylistListPage() {
  const { playlists } = await playlistsApi.listPlaylists({ pageSize: 1000 });

  return (
    <>
      <ItemListJsonLd
        name="Playlists"
        items={playlists.map((playlist) => ({ title: playlist.title, path: urls.playlistDetail(playlist.slug) }))}
      />
      <PageHeader />
      <SiteSidebar active="playlists" />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-5xl px-8 sm:px-14 py-16">
          <span className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15V6" />
              <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              <path d="M12 12H3" />
              <path d="M16 6H3" />
              <path d="M12 18H3" />
            </svg>
            curated reading, in order
          </span>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6 max-w-2xl">
            Playlists for <span className="text-brand-600">deep reading.</span>
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed max-w-xl mb-14">
            A playlist is a stack of articles worth reading in order — grouped by a writer around one
            real thread, not just a tag applied after the fact.
          </p>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">All Playlists</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                {playlists.length} playlist{pluralize(playlists.length)}
              </span>
              <IfAuthenticated>
                <Link
                  href={urls.playlistCreate()}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  New
                </Link>
              </IfAuthenticated>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {playlists.length === 0 ? (
              <div className="col-span-2 text-center py-20 border border-dashed border-slate-200 rounded-2xl">
                <svg className="mx-auto mb-4 w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15V6" />
                  <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path d="M12 12H3" />
                  <path d="M16 6H3" />
                  <path d="M12 18H3" />
                </svg>
                <p className="text-slate-500 mb-4">No playlists yet.</p>
                <IfAuthenticated>
                  <Link href={urls.playlistCreate()} className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
                    Create the first playlist
                  </Link>
                </IfAuthenticated>
              </div>
            ) : (
              playlists.map((playlist) => (
                <Link
                  key={playlist.slug}
                  href={urls.playlistDetail(playlist.slug)}
                  className="group block rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden"
                >
                  <div className="h-36 relative flex items-center justify-center overflow-hidden bg-slate-100 [&>svg]:absolute [&>svg]:inset-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover">
                    <Media src={playlist.image} alt={playlist.title} avatarSvg={playlist.avatar_svg} />
                    <span className="absolute bottom-3 right-3 text-[11px] font-semibold text-white bg-black/25 backdrop-blur-xs rounded-full px-2.5 py-1 z-10">
                      {playlist.blog_count} blog{pluralize(playlist.blog_count)}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 text-lg mb-1.5 group-hover:text-brand-700 transition-colors">
                      {playlist.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-3">
                      {truncateWords(playlist.description, 16)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-5 h-5 rounded-full overflow-hidden [&>svg]:w-full [&>svg]:h-full">
                        <Media
                          src={playlist.author.profile_picture}
                          alt={playlist.author.username}
                          avatarSvg={playlist.author.avatar_svg}
                        />
                      </div>
                      {playlist.author.display_name} <span>·</span> updated{" "}
                      {formatDate(playlist.updated_at, "M d")}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
