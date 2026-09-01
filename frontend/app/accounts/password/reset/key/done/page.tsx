import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell, SubmitArrow, SuccessBadge } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

/** Django: `/accounts/password/reset/key/done/` → `account/password_reset_from_key_done.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Password Updated — Inkwell",
};

export default function PasswordResetFromKeyDonePage() {
  return (
    <AuthShell centered>
      <SuccessBadge />
      <h1 className="text-2xl font-extrabold tracking-tight mb-3">Password updated</h1>
      <p className="text-sm text-slate-500 leading-relaxed mb-6">
        Your password has been successfully reset. You can now log in with your new password.
      </p>

      <Link
        href={urls.accountLogin()}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        Log in
        <SubmitArrow />
      </Link>
    </AuthShell>
  );
}
