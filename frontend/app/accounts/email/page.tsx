import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ProfileBreadcrumb } from "@/components/profile-breadcrumb";
import { SiteSidebar } from "@/components/site-sidebar";

import { EmailAddresses } from "./email-addresses";

/** Django: `/accounts/email/` → django-allauth → `account/email.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Email Addresses — Inkwell",
};

export default function EmailPage() {
  return (
    <>
      <PageHeader />
      <SiteSidebar active="profile" />

      <main className="pt-16 lg:pl-60">
        <div className="max-w-2xl px-8 sm:px-14 py-14">
          <ProfileBreadcrumb current="Email addresses" wrapperClassName="text-muted" linkClassName="hover:text-ink" />

          <h1 className="serif text-3xl font-semibold tracking-tight mb-8">Email addresses</h1>

          <EmailAddresses />
        </div>
      </main>
    </>
  );
}
