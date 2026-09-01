import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Linebreaks } from "@/components/linebreaks";
import { LinkedInIcon, LinkedInPostedBadge } from "@/components/linkedin-icon";
import { Media } from "@/components/media";
import { OwnerOnly } from "@/components/owner-only";
import { PageHeader } from "@/components/page-header";
import { ProfileTabs } from "@/components/profile-tabs";
import { SiteSidebar } from "@/components/site-sidebar";
import { SavedBlogsPanel } from "@/components/saved-blogs-panel";
import { blogs as blogsApi, users as usersApi } from "@/lib/api";
import { blogSummary } from "@/lib/blog";
import { formatDate, pluralize } from "@/lib/format";
import { ProfileJsonLd } from "@/components/json-ld";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";
import type { Blog, Playlist, User } from "@/lib/types";

/** Django: `/profile/<username>/` → `UserProfileView` → `blog/profile.html` */

export async function generateStaticParams() {
  return (await usersApi.listAllUsernames()).map((username) => ({ username }));
}

export async function generateMetadata({ params }: PageProps<"/profile/[username]">): Promise<Metadata> {
  const user = await usersApi.getUser((await params).username);
  if (!user) return { title: "Page not found — Inkwell" };

  return buildMetadata({
    title: `${user.display_name} — Inkwell`,
    description: user.bio || `Articles and playlists by ${user.display_name} on BlogerMenia.`,
    path: urls.userProfile(user.username),
    image: user.profile_picture,
    type: "article",
  });
}

function EyeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function EmptyState({
  icon,
  message,
  action,
}: {
  icon: React.ReactNode;
  message: string;
  action: React.ReactNode;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <p className="text-slate-500 text-sm mb-5">{message}</p>
      {action}
    </div>
  );
}

function BlogsPanel({ blogs, profileUser }: { blogs: Blog[]; profileUser: User }) {
  if (blogs.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        }
        message="No articles published yet."
        action={
          <OwnerOnly username={profileUser.username}>
            <Link href={urls.blogCreate()} className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
              Write your first article
            </Link>
          </OwnerOnly>
        }
      />
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {blogs.map((blog) => (
        <div
          key={blog.slug}
          className="group relative flex flex-col rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden bg-white"
        >
          <Link href={urls.blogDetail(blog.slug)} className="absolute inset-0 z-10">
            <span className="sr-only">View {blog.title}</span>
          </Link>
          <div className="h-36 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover">
            <Media src={blog.image} alt={blog.title} avatarSvg={blog.avatar_svg} />
          </div>
          <div className="flex flex-col flex-1 p-5">
            {blog.category && (
              <span className={`text-[11px] font-bold tracking-wide ${blog.category.text_class} ${blog.category.bg_class} rounded-full px-2 py-0.5 uppercase w-fit mb-2`}>
                {blog.category.name}
              </span>
            )}
            <h3 className="font-bold text-slate-900 text-[15px] leading-snug mb-1.5 group-hover:text-brand-700 transition-colors">
              {blog.title}
              <LinkedInPostedBadge postedOnLinkedin={blog.posted_on_linkedin} linkedinPostUrl={blog.linkedin_post_url} />
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">{blogSummary(blog, 18)}</p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span>{formatDate(blog.created_at, "M d, Y")}</span>
              <span className="flex items-center gap-1">
                <EyeIcon />
                {blog.read_count}
              </span>
              <span className="flex items-center gap-1">
                <HeartIcon />
                {blog.like_count}
              </span>
              <OwnerOnly username={profileUser.username}>
                <Link
                  href={urls.blogUpdate(blog.slug)}
                  className="relative z-20 ml-auto text-slate-400 hover:text-brand-600 border border-slate-200 hover:border-brand-300 rounded-md px-2 py-0.5 transition-colors"
                >
                  Edit
                </Link>
              </OwnerOnly>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaylistsPanel({ playlists, profileUser }: { playlists: Playlist[]; profileUser: User }) {
  if (playlists.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15V6" />
            <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path d="M12 12H3" />
            <path d="M16 6H3" />
            <path d="M12 18H3" />
          </svg>
        }
        message="No playlists created yet."
        action={
          <OwnerOnly username={profileUser.username}>
            <Link href={urls.playlistCreate()} className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
              Create a playlist
            </Link>
          </OwnerOnly>
        }
      />
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {playlists.map((playlist) => (
        <div
          key={playlist.slug}
          className="group relative block rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/60 transition-all overflow-hidden bg-white"
        >
          <Link href={urls.playlistDetail(playlist.slug)} className="absolute inset-0 z-10">
            <span className="sr-only">View {playlist.title}</span>
          </Link>
          <div className="relative h-40 p-4 flex items-end justify-center overflow-hidden bg-slate-100 [&>svg]:absolute [&>svg]:inset-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover">
            <Media
              src={playlist.image}
              alt={playlist.title}
              avatarSvg={playlist.avatar_svg}
              imgClassName="absolute inset-0 w-full h-full object-cover"
            />
            <span className="relative z-10 bg-black/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs">
              {playlist.blogs.length} blog{pluralize(playlist.blogs.length)}
            </span>
          </div>

          <div className="p-5 bg-white">
            <h3 className="font-bold text-slate-900 group-hover:text-brand-700 transition-colors leading-snug mb-1.5">
              {playlist.title}
            </h3>
            {playlist.description && (
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{playlist.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Updated {formatDate(playlist.updated_at, "M d, Y")}
              </span>
              <OwnerOnly username={profileUser.username}>
                <Link
                  href={urls.playlistUpdate(playlist.slug)}
                  className="relative z-20 text-xs text-slate-400 hover:text-brand-600 border border-slate-200 hover:border-brand-300 rounded-md px-2 py-0.5 transition-colors"
                >
                  Edit
                </Link>
              </OwnerOnly>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SavedBlogCard({ blog }: { blog: Blog }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden bg-white">
      <Link href={urls.blogDetail(blog.slug)} className="absolute inset-0 z-10">
        <span className="sr-only">View {blog.title}</span>
      </Link>
      <div className="h-36 overflow-hidden bg-slate-100 flex items-center justify-center relative [&>svg]:absolute [&>svg]:inset-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover">
        <Media src={blog.image} alt={blog.title} avatarSvg={blog.avatar_svg} />
        {blog.category && (
          <div className={`absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${blog.category.text_class} z-20`}>
            {blog.category.name}
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1 relative">
        <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-brand-700 transition-colors leading-snug line-clamp-2">
          {blog.title}
          <LinkedInPostedBadge postedOnLinkedin={blog.posted_on_linkedin} linkedinPostUrl={blog.linkedin_post_url} />
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{blogSummary(blog, 20)}</p>
        <div className="mt-auto flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <EyeIcon />
            {blog.read_count}
          </span>
          <span className="flex items-center gap-1">
            <HeartIcon />
            {blog.like_count}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function ProfilePage({ params }: PageProps<"/profile/[username]">) {
  const profile = await usersApi.getProfile((await params).username);
  if (!profile) notFound();

  const { user: profileUser, blogs: user_blogs, playlists: user_playlists } = profile;
  const has_linkedin_oauth = profileUser.has_linkedin_oauth;
  // Cards for every published post; the Saved tab filters them by the viewer's set.
  const { blogs: savableBlogs } = await blogsApi.listBlogs({ pageSize: 1000 });

  return (
    <>
      <ProfileJsonLd user={profileUser} blogCount={user_blogs.length} />
      <PageHeader />
      <SiteSidebar active="profile" />

      <main className="pt-16 lg:pl-64">
        {/* Cover banner */}
        <div className="h-44 sm:h-52 bg-linear-to-br from-brand-400 via-indigo-500 to-purple-600 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute top-6 right-16 w-20 h-20 rounded-full bg-white/5" />
        </div>

        <div className="max-w-5xl px-8 sm:px-14">
          {/* Profile header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-14 pb-8 border-b border-slate-100">
            <div className="flex items-end gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-300/40 shrink-0 overflow-hidden">
                {profileUser.profile_picture ? (
                  // eslint-disable-next-line @next/next/no-img-element -- matches the original profile markup.
                  <img
                    src={profileUser.profile_picture}
                    alt={profileUser.username}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl overflow-hidden [&>svg]:w-full [&>svg]:h-full">
                    <Media src={null} alt={profileUser.username} avatarSvg={profileUser.avatar_svg} />
                  </div>
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    {profileUser.full_name || profileUser.username}
                  </h1>
                  {profileUser.linkedin_url ? (
                    <a
                      href={profileUser.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A66C2] hover:text-[#004182] transition-colors"
                      title="LinkedIn Profile"
                    >
                      <LinkedInIcon className="w-5 h-5" />
                    </a>
                  ) : profileUser.has_linkedin_oauth ? (
                    <div className="text-[#0A66C2] opacity-80 cursor-help" title="LinkedIn Connected">
                      <LinkedInIcon className="w-5 h-5" />
                    </div>
                  ) : null}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">@{profileUser.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-1 flex-wrap">
              <OwnerOnly username={profileUser.username}>
                <Link
                  href={urls.profileEdit(profileUser.username)}
                  className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Profile
                </Link>
                {!has_linkedin_oauth && (
                  <a
                    href={urls.linkedinLogin()}
                    className="inline-flex items-center gap-2 border border-[#0A66C2]/30 hover:bg-blue-50 text-[#0A66C2] font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                  >
                    <LinkedInIcon />
                    Connect with LinkedIn
                  </a>
                )}
              </OwnerOnly>
            </div>
          </div>

          {/* Bio + stats row */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-8 py-8 border-b border-slate-100">
            <div>
              {profileUser.bio && (
                <p className="text-slate-600 leading-relaxed max-w-xl mb-4">{profileUser.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Joined {formatDate(profileUser.date_joined, "F Y")}
                </span>
              </div>
            </div>
            <div className="flex gap-8 sm:min-w-[160px]">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-slate-900 mono">{user_blogs.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">Articles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-slate-900 mono">{user_playlists.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">Playlists</p>
              </div>
            </div>
          </div>

          <ProfileTabs
            profileUsername={profileUser.username}
            blogsPanel={<BlogsPanel blogs={user_blogs} profileUser={profileUser} />}
            playlistsPanel={<PlaylistsPanel playlists={user_playlists} profileUser={profileUser} />}
            savedPanel={<SavedBlogsPanel cards={savableBlogs.map((blog) => ({ id: blog.id, node: <SavedBlogCard blog={blog} /> }))} />}
            aboutPanel={
              profileUser.about ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-lg mb-4">About</h3>
                  <div className="prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-a:text-brand-600 hover:prose-a:text-brand-700">
                    <Linebreaks text={profileUser.about} />
                  </div>
                </div>
              ) : null
            }
          />
        </div>
      </main>
    </>
  );
}
