import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageContainer, PageShell } from "@/components/page-shell";
import { getViewer } from "@/lib/auth/session";
import { urls } from "@/lib/urls";

import { ProfileEditForm } from "./profile-edit-form";

/** `/profile/<username>/edit/` — your own profile, and only your own. */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Edit Profile — Blogermenia",
};

export default async function ProfileEditPage({ params }: PageProps<"/profile/[username]/edit">) {
  const { username } = await params;

  // Read from the session rather than the public profile endpoint: the form
  // edits private fields (the LinkedIn auto-post preference), and this page
  // should not render an edit form for a profile the viewer cannot save.
  const viewer = await getViewer();
  if (!viewer) redirect(`${urls.accountLogin()}?next=${encodeURIComponent(urls.userProfileEdit(username))}`);
  if (viewer.username !== username) notFound();

  return (
    <>
      <PageShell active="profile">
        <PageContainer className="max-w-2xl">
          <Breadcrumbs
            items={[
              { name: viewer.display_name, href: urls.userProfile(viewer.username) },
              { name: "Edit profile" },
            ]}
          />

          <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400">ACCOUNT SETTINGS</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Edit profile</h1>
          <p className="mt-2 leading-relaxed text-slate-500">
            Your name, bio and links as readers see them on your profile.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <ProfileEditForm profileUser={viewer} />
          </div>
        </PageContainer>
      </PageShell>
    </>
  );
}
