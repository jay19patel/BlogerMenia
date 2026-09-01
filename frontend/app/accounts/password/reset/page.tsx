import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell, LockBadge } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

import { PasswordResetForm } from "./reset-form";

/** Django: `/accounts/password/reset/` → django-allauth → `account/password_reset.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Forgot Password — Inkwell",
};

export default function PasswordResetPage() {
  return (
    <AuthShell
      footer={
        <p className="text-center text-sm text-slate-500 mt-6">
          Remember your password?{" "}
          <Link href={urls.accountLogin()} className="font-semibold text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </p>
      }
    >
      <div className="flex flex-col items-center text-center mb-8">
        <LockBadge />
        <h1 className="text-2xl font-extrabold tracking-tight mb-1.5">Forgot password?</h1>
        <p className="text-sm text-slate-500">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <PasswordResetForm />
    </AuthShell>
  );
}
