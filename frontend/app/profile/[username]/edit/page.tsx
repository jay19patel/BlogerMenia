import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageContainer, PageShell } from "@/components/page-shell";
import { users as usersApi } from "@/lib/api";
import { urls } from "@/lib/urls";

import { ProfileEditForm } from "./profile-edit-form";

/** Django: `/profile/<username>/edit/` → `ProfileUpdateView` → `blog/profile_edit.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Edit Profile — Blogermenia",
};

export async function generateStaticParams() {
  return (await usersApi.listAllUsernames()).map((username) => ({ username }));
}

export default async function ProfileEditPage({ params }: PageProps<"/profile/[username]/edit">) {
  const profileUser = await usersApi.getUser((await params).username);
  if (!profileUser) notFound();

  return (
    <>
      <PageShell active="profile">
        <PageContainer className="max-w-2xl">
          <Breadcrumbs
            items={[
              { name: profileUser.display_name, href: urls.userProfile(profileUser.username) },
              { name: "Edit profile" },
            ]}
          />

          <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400">ACCOUNT SETTINGS</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Edit profile</h1>
          <p className="mt-2 leading-relaxed text-slate-500">
            Your name, bio and links as readers see them on your profile.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <ProfileEditForm profileUser={profileUser} />
          </div>
        </PageContainer>
      </PageShell>
    </>
  );
}
