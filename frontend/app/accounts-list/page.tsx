import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LinkedInIcon } from "@/components/icons";
import { AuthorAvatar } from "@/components/media";
import { EmptyState } from "@/components/empty-state";
import { users as usersApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PageContainer, PageShell } from "@/components/page-shell";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/accounts-list/` → `UserListView` → `blog/user_list.html` */

export const metadata: Metadata = buildMetadata({
  title: "Community — BlogerMenia",
  description: "Discover the writers publishing on BlogerMenia, their blogs and their playlists.",
  path: urls.userList(),
});

export default async function UserListPage() {
  const users = await usersApi.listUsers();

  return (
    <>
      <PageShell active="community">
        <PageContainer className="max-w-5xl sm:py-16">
          <Breadcrumbs
            items={[{ name: "Home", href: urls.home() }, { name: "Community", href: urls.userList() }]}
          />

          <span className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Who&apos;s writing
          </span>

          <h1 className="text-4xl font-extrabold tracking-tight mb-3">The Community</h1>
          <p className="text-slate-500 text-lg leading-relaxed max-w-xl mb-12">
            Discover writers, their blogs, and their curated playlists.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.length === 0 ? (
              <EmptyState className="col-span-full" message="No accounts found." />
            ) : (
              users.map((author) => (
                <div
                  key={author.username}
                  className="group relative flex flex-col items-center text-center p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all bg-white"
                >
                  <Link href={urls.userProfile(author.username)} className="absolute inset-0 z-0 rounded-2xl">
                    <span className="sr-only">View {author.username}</span>
                  </Link>
                  <AuthorAvatar user={author} className="mb-4 size-16 shrink-0" />
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <h2 className="font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                      {author.full_name || author.username}
                    </h2>
                    {author.linkedin_url ? (
                      <a
                        href={author.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-10 text-[#0A66C2] hover:text-[#004182] transition-colors shrink-0"
                        title="LinkedIn Profile"
                      >
                        <LinkedInIcon className="w-4 h-4" />
                      </a>
                    ) : author.has_linkedin_oauth ? (
                      <div className="text-[#0A66C2]/70 cursor-help shrink-0" title="LinkedIn Connected">
                        <LinkedInIcon className="w-4 h-4" />
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    @{author.username} · joined {formatDate(author.date_joined, "M Y")}
                  </p>
                  <div className="flex items-center gap-6 text-sm border-t border-slate-100 pt-4 w-full justify-center">
                    <div>
                      <span className="block font-extrabold text-slate-900">{author.blog_count}</span>
                      <span className="text-xs text-slate-400">Blogs</span>
                    </div>
                    <div>
                      <span className="block font-extrabold text-slate-900">{author.playlist_count}</span>
                      <span className="text-xs text-slate-400">Playlists</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PageContainer>
      </PageShell>
    </>
  );
}
