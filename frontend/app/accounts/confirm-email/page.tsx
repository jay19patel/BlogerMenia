import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell, MailBadge } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

/** Django: `/accounts/confirm-email/` → django-allauth → `account/verification_sent.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Verify Your Email — Inkwell",
};

export default function VerificationSentPage() {
  return (
    <AuthShell centered>
      <MailBadge />
      <h1 className="text-2xl font-extrabold tracking-tight mb-3">Verify your email</h1>
      <p className="text-sm text-slate-500 leading-relaxed mb-6">
        We&apos;ve sent a verification link to your email address. Please check your inbox and click
        the link to activate your account.
      </p>
      <p className="text-xs text-slate-400">
        Didn&apos;t receive it? Check your spam folder or{" "}
        <Link href={urls.accountEmail()} className="font-semibold text-brand-600 hover:text-brand-700">
          manage your email
        </Link>
        .
      </p>
    </AuthShell>
  );
}
