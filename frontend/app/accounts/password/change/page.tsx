import type { Metadata } from "next";

import { AuthShell } from "@/components/auth-shell";
import { ChangePasswordForm } from "./change-password-form";

/** Django: `/accounts/password/change/` → django-allauth → `account/password_change.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Change Password — BlogerMenia",
};

export default function PasswordChangePage() {
  return (
    <AuthShell>
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight mb-1.5">Change password</h1>
        <p className="text-sm text-slate-500">
          Pick something you don't use anywhere else. You'll stay signed in on this device.
        </p>
      </div>

      <ChangePasswordForm />
    </AuthShell>
  );
}
