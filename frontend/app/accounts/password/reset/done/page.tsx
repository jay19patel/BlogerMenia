import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell, SuccessBadge } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

/** Django: `/accounts/password/reset/done/` → `account/password_reset_done.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Check Your Email — Inkwell",
};

export default function PasswordResetDonePage() {
  return (
    <AuthShell centered>
      <SuccessBadge />
      <h1 className="text-2xl font-extrabold tracking-tight mb-3">Check your email</h1>
      <p className="text-sm text-slate-500 leading-relaxed mb-6">
        We&apos;ve sent a password reset link to your email address. The link will expire in a few
        minutes.
      </p>
      <p className="text-xs text-slate-400">
        Didn&apos;t receive it? Check your spam folder or{" "}
        <Link href={urls.accountResetPassword()} className="font-semibold text-brand-600 hover:text-brand-700">
          try again
        </Link>
        .
      </p>
    </AuthShell>
  );
}
