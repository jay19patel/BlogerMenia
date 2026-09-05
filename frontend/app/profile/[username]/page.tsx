import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Linebreaks } from "@/components/linebreaks";
import { Edit01, LinkedInIcon, LinkedInPostedBadge } from "@/components/icons";
import { MediaFrame } from "@/components/media";
import { CategoryBadge } from "@/components/category-badge";
import { EmptyState as SharedEmptyState } from "@/components/empty-state";
import { BooksIcon, PlaylistIcon } from "@/components/nav-icons";
import { OwnerOnly } from "@/components/owner-only";
import { ProfileTabs } from "@/components/profile-tabs";
import { SavedBlogsPanel } from "@/components/saved-blogs-panel";
import { blogs as blogsApi, users as usersApi } from "@/lib/api";
import { blogSummary } from "@/lib/blog";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { formatDate, pluralize } from "@/lib/format";
import { BreadcrumbJsonLd, ProfileJsonLd } from "@/components/json-ld";
import { PageContainer, PageShell } from "@/components/page-shell";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";
import type { Blog, Playlist, User } from "@/lib/types";

/** Django: `/profile/<username>/` → `UserProfileView` → `blog/profile.html` */

export async function generateStaticParams() {
  return (await usersApi.listAllUsernames()).map((username) => ({ username }));
}

export async function generateMetadata({ params }: PageProps<"/profile/[username]">): Promise<Metadata> {
  const user = await usersApi.getUser((await params).username);
  if (!user) return { title: "Page not found — BlogerMenia" };

  return buildMetadata({
    title: `${user.display_name} — BlogerMenia`,
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

function BlogsPanel({ blogs, profileUser }: { blogs: Blog[]; profileUser: User }) {
  if (blogs.length === 0) {
    return (
      <SharedEmptyState
        variant="plain"
        icon={<BooksIcon className="size-7" strokeWidth={1.5} />}
        message="No articles published yet."
        action={
          <OwnerOnly username={profileUser.username}>
            <Button color="primary" size="md" href={urls.blogCreate()}>
              Write your first article
            </Button>
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
          className="group relative flex flex-col rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden bg-white"
        >
          <Link href={urls.blogDetail(blog.slug)} className="absolute inset-0 z-10">
            <span className="sr-only">View {blog.title}</span>
          </Link>
          <MediaFrame src={blog.image} alt={blog.title} avatarSvg={blog.avatar_svg} className="h-36 shrink-0" />
          <div className="flex flex-col flex-1 p-5">
            <CategoryBadge category={blog.category} fallback={null} className="mb-2 w-fit" />
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
                <div className="ml-auto relative z-20">
                  <ButtonUtility size="xs" color="secondary" tooltip="Edit" icon={Edit01} href={urls.blogUpdate(blog.slug)} />
                </div>
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
      <SharedEmptyState
        variant="plain"
        icon={<PlaylistIcon className="size-7" strokeWidth={1.5} />}
        message="No playlists created yet."
        action={
          <OwnerOnly username={profileUser.username}>
            <Button color="primary" size="md" href={urls.playlistCreate()}>
              Create a playlist
            </Button>
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
          className="group relative block rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60 transition-all overflow-hidden bg-white"
        >
          <Link href={urls.playlistDetail(playlist.slug)} className="absolute inset-0 z-10">
            <span className="sr-only">View {playlist.title}</span>
          </Link>
          <MediaFrame
            src={playlist.image}
            alt={playlist.title}
            avatarSvg={playlist.avatar_svg}
            imgClassName="absolute inset-0 w-full h-full object-cover"
            className="relative h-40 [&>svg]:absolute [&>svg]:inset-0"
          >
            <span className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md border border-white/20 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 shrink-0">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
              <span>{playlist.blogs.length} {playlist.blogs.length === 1 ? "blog" : "blogs"}</span>
            </span>
          </MediaFrame>

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
                <div className="relative z-20">
                  <ButtonUtility size="xs" color="secondary" tooltip="Edit" icon={Edit01} href={urls.playlistUpdate(playlist.slug)} />
                </div>
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
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden bg-white">
      <Link href={urls.blogDetail(blog.slug)} className="absolute inset-0 z-10">
        <span className="sr-only">View {blog.title}</span>
      </Link>
      <MediaFrame
        src={blog.image}
        alt={blog.title}
        avatarSvg={blog.avatar_svg}
        className="relative h-36 [&>svg]:absolute [&>svg]:inset-0"
      >
        {blog.category && (
          <div className={`absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${blog.category.text_class} z-20`}>
            {blog.category.name}
          </div>
        )}
      </MediaFrame>
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
      {/*
        Structured data only: the page deliberately leads with a full-bleed
        cover banner, so there is nowhere to put a visible trail without
        fighting the design. Crawlers still get the hierarchy.
      */}
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: urls.home() },
          { name: "Community", path: urls.userList() },
          { name: profileUser.display_name, path: urls.userProfile(profileUser.username) },
        ]}
      />
      <PageShell active="profile">
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

        <PageContainer className="max-w-5xl py-0 sm:py-0">
          {/* Profile header */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-14 pb-8 border-b border-slate-100">
            <div className="flex items-end gap-5">
              <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-300/40 sm:size-28">
                <MediaFrame
                  src={profileUser.profile_picture}
                  alt={profileUser.username}
                  avatarSvg={profileUser.avatar_svg}
                  imgClassName="w-full h-full rounded-xl object-cover"
                  className="h-full w-full rounded-xl bg-transparent"
                />
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
                <Button color="secondary" size="md" href={urls.profileEdit(profileUser.username)} iconLeading={Edit01}>
                  Edit Profile
                </Button>
                {!has_linkedin_oauth && (
                  <Button color="secondary" size="md" href={urls.linkedinLogin()} iconLeading={LinkedInIcon} className="text-[#0A66C2]">
                    Connect with LinkedIn
                  </Button>
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
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-lg mb-4">About</h3>
                  <div className="prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-a:text-brand-600 hover:prose-a:text-brand-700">
                    <Linebreaks text={profileUser.about} />
                  </div>
                </div>
              ) : null
            }
          />
        </PageContainer>
      </PageShell>
    </>
  );
}
