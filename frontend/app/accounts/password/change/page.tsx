import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ProfileBreadcrumb } from "@/components/profile-breadcrumb";
import { SiteSidebar } from "@/components/site-sidebar";

import { ChangePasswordForm } from "./change-password-form";

/** Django: `/accounts/password/change/` → django-allauth → `account/password_change.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Change Password — Inkwell",
};

export default function PasswordChangePage() {
  return (
    <>
      <PageHeader />
      <SiteSidebar active="profile" />

      <main className="pt-16 lg:pl-60">
        <div className="max-w-2xl px-8 sm:px-14 py-14">
          <ProfileBreadcrumb current="Change password" linkClassName="hover:text-ink" wrapperClassName="text-muted" />

          <h1 className="serif text-3xl font-semibold tracking-tight mb-8">Change password</h1>

          <div className="bg-white border border-line rounded-lg p-8 max-w-md">
            <ChangePasswordForm />
          </div>
        </div>
      </main>
    </>
  );
}
