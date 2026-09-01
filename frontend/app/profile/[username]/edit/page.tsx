import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
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
      <PageHeader />
      <SiteSidebar active="profile" />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-2xl px-8 sm:px-14 py-14">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <Link href={urls.userProfile(profileUser.username)} className="hover:text-slate-600 transition-colors">
              Profile
            </Link>
            <span>/</span>
            <span>Edit</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-8">Edit profile</h1>

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xs">
            <ProfileEditForm profileUser={profileUser} />
          </div>
        </div>
      </main>
    </>
  );
}
