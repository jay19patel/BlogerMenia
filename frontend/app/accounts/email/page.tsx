import type { Metadata } from "next";

import { SettingsPage } from "@/components/settings-page";

import { EmailAddresses } from "./email-addresses";

/** Django: `/accounts/email/` → django-allauth → `account/email.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Email Addresses — BlogerMenia",
};

export default function EmailPage() {
  return (
    <SettingsPage
      current="Email addresses"
      title="Email addresses"
      description="The addresses linked to your account. The primary one receives notifications and password resets."
    >
      <EmailAddresses />
    </SettingsPage>
  );
}
