import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PlaylistIcon } from "@/components/nav-icons";
import { IfAuthenticated } from "@/components/auth-gate";
import { AuthorAvatar, MediaFrame } from "@/components/media";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { playlists as playlistsApi } from "@/lib/api";
import { formatDate, pluralize, truncateWords } from "@/lib/format";
import { ItemListJsonLd } from "@/components/json-ld";
import { PageContainer, PageShell } from "@/components/page-shell";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/playlists/` → `PlaylistListView` → `blog/playlist_list.html` */

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = buildMetadata({
  title: "Playlists — BlogerMenia",
  description: "Curated reading lists — stacks of articles grouped by a writer around one thread.",
  path: urls.playlistList(),
});

export default async function PlaylistListPage({ searchParams }: PageProps<"/playlists">) {
  const requestedPage = Number.parseInt(firstParam((await searchParams).page) ?? "1", 10);
  const { playlists, count, page, totalPages } = await playlistsApi.listPlaylists({
    page: Number.isNaN(requestedPage) ? 1 : requestedPage,
  });

  return (
    <>
      <ItemListJsonLd
        name="Playlists"
        items={playlists.map((playlist) => ({ title: playlist.title, path: urls.playlistDetail(playlist.slug) }))}
      />
      <PageShell active="playlists">
        <PageContainer className="max-w-5xl sm:py-16">
          <Breadcrumbs
            items={[{ name: "Home", href: urls.home() }, { name: "Playlists", href: urls.playlistList() }]}
          />

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
                {count} playlist{pluralize(count)}
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
              <EmptyState
                className="col-span-full"
                icon={<PlaylistIcon className="size-7" strokeWidth={1.5} />}
                message="No playlists yet."
                action={
                  <IfAuthenticated>
                    <Link href={urls.playlistCreate()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                      Create the first playlist
                    </Link>
                  </IfAuthenticated>
                }
              />
            ) : (
              playlists.map((playlist) => (
                <Link
                  key={playlist.slug}
                  href={urls.playlistDetail(playlist.slug)}
                  className="group block rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden"
                >
                  <MediaFrame
                    src={playlist.image}
                    alt={playlist.title}
                    avatarSvg={playlist.avatar_svg}
                    className="relative h-36"
                  >
                    <span className="absolute right-3 bottom-3 z-10 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
                      {playlist.blog_count} blog{pluralize(playlist.blog_count)}
                    </span>
                  </MediaFrame>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 text-lg mb-1.5 group-hover:text-brand-700 transition-colors">
                      {playlist.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-3">
                      {truncateWords(playlist.description, 16)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <AuthorAvatar user={playlist.author} className="size-5" />
                      {playlist.author.display_name} <span>·</span> updated{" "}
                      {formatDate(playlist.updated_at, "M d")}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Pagination page={page} totalPages={totalPages} />
        </PageContainer>
      </PageShell>
    </>
  );
}
