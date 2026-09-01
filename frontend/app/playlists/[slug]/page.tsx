import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LinkedInPostedBadge } from "@/components/linkedin-icon";
import { Media } from "@/components/media";
import { OwnerOnly, VisibleToOwnerOrPublic } from "@/components/owner-only";
import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { playlists as playlistsApi } from "@/lib/api";
import { formatDate, pluralize } from "@/lib/format";
import { CollectionJsonLd } from "@/components/json-ld";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/playlists/<slug>/` → `PlaylistDetailView` → `blog/playlist_detail.html` */

export async function generateStaticParams() {
  return (await playlistsApi.listAllPlaylistSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/playlists/[slug]">): Promise<Metadata> {
  const playlist = await playlistsApi.getPlaylist((await params).slug);
  if (!playlist) return { title: "Page not found — Inkwell" };

  return buildMetadata({
    title: `${playlist.title} — Playlist — Inkwell`,
    description: playlist.description || undefined,
    path: urls.playlistDetail(playlist.slug),
    image: playlist.image,
  });
}

export default async function PlaylistDetailPage({ params }: PageProps<"/playlists/[slug]">) {
  const playlist = await playlistsApi.getPlaylist((await params).slug);
  if (!playlist) notFound();

  const firstBlog = playlist.blogs[0];

  return (
    <>
      <CollectionJsonLd playlist={playlist} />
      <PageHeader />
      <SiteSidebar active="playlists" />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-4xl px-8 sm:px-14 py-14">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <Link href={urls.home()} className="hover:text-slate-600 transition-colors">
              Blogs
            </Link>
            <span>/</span>
            <Link href={urls.playlistList()} className="hover:text-slate-600 transition-colors">
              Playlists
            </Link>
          </div>

          {/* Playlist header */}
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end pb-8 border-b border-slate-100 mb-8">
            <div className="w-full sm:w-44 h-44 rounded-2xl shrink-0 flex items-center justify-center shadow-lg overflow-hidden bg-slate-100 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover">
              <Media
                src={playlist.image}
                alt={playlist.title}
                avatarSvg={playlist.avatar_svg}
                imgClassName="w-full h-full object-cover rounded-2xl"
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold tracking-wide text-brand-600 mb-2">
                PLAYLIST · {playlist.blogs.length} BLOG{pluralize(playlist.blogs.length, "S")}
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">{playlist.title}</h1>
              <p className="text-slate-500 leading-relaxed max-w-lg mb-4">{playlist.description}</p>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="w-6 h-6 rounded-full overflow-hidden [&>svg]:w-full [&>svg]:h-full">
                  <Media
                    src={playlist.author.profile_picture}
                    alt={playlist.author.username}
                    avatarSvg={playlist.author.avatar_svg}
                  />
                </div>
                <Link
                  href={urls.userProfile(playlist.author.username)}
                  className="font-medium text-slate-700 hover:text-brand-600 transition-colors"
                >
                  {playlist.author.display_name}
                </Link>
                <span>·</span>
                <span>updated {formatDate(playlist.updated_at, "M d")}</span>
              </div>
            </div>

            <div className="flex sm:flex-col gap-3 sm:items-end">
              {firstBlog && (
                <Link
                  href={urls.blogDetail(firstBlog.slug)}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Read All
                </Link>
              )}
              <OwnerOnly username={playlist.author.username}>
                <Link
                  href={urls.playlistUpdate(playlist.slug)}
                  className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
                >
                  Edit
                </Link>
                <Link
                  href={urls.playlistDelete(playlist.slug)}
                  className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-500 hover:bg-red-50 font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
                >
                  Delete
                </Link>
              </OwnerOnly>
            </div>
          </div>

          {/* Blog track list */}
          <div className="flex flex-col divide-y divide-slate-100">
            {playlist.blogs.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-slate-500 text-sm">No blogs in this playlist yet.</p>
              </div>
            ) : (
              playlist.blogs.map((blog, index) => (
                <VisibleToOwnerOrPublic
                  key={blog.slug}
                  isPublished={blog.is_published}
                  username={blog.author.username}
                >
                  <Link
                    href={urls.blogDetail(blog.slug)}
                    className="group flex items-center gap-4 py-4 px-3 -mx-3 rounded-xl hover:bg-slate-50/60 transition-colors"
                  >
                    <span className="w-6 text-center text-sm font-semibold text-slate-300 group-hover:hidden">
                      {index + 1}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-brand-600 hidden group-hover:block w-6 shrink-0">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center overflow-hidden bg-slate-100 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover">
                      <Media
                        src={blog.image}
                        alt={blog.title}
                        avatarSvg={blog.avatar_svg}
                        imgClassName="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
                        {blog.title}
                        <LinkedInPostedBadge
                          postedOnLinkedin={blog.posted_on_linkedin}
                          linkedinPostUrl={blog.linkedin_post_url}
                        />
                        {!blog.is_published && (
                          <>
                            {" "}
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm ml-1">
                              Draft
                            </span>
                          </>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {blog.author.display_name} · {formatDate(blog.created_at, "M d")}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 mono shrink-0">{blog.read_count} reads</span>
                  </Link>
                </VisibleToOwnerOrPublic>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
