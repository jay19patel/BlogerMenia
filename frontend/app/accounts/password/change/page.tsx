import type { Metadata } from "next";

import { SettingsCard } from "@/components/settings-card";
import { SettingsPage } from "@/components/settings-page";

import { ChangePasswordForm } from "./change-password-form";

/** Django: `/accounts/password/change/` → django-allauth → `account/password_change.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Change Password — BlogerMenia",
};

export default function PasswordChangePage() {
  return (
    <SettingsPage
      current="Change password"
      title="Change password"
      description="Pick something you don't use anywhere else. You'll stay signed in on this device."
    >
      <SettingsCard>
        <ChangePasswordForm />
      </SettingsCard>
    </SettingsPage>
  );
}
