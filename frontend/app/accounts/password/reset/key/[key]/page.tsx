import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell, ErrorBadge, LockBadge } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

import { SetPasswordForm } from "./set-password-form";

/**
 * Django: `/accounts/password/reset/key/<uidb36>-<key>/` → django-allauth →
 * `account/password_reset_from_key.html`.
 *
 * There is no token store to consult, so the key is judged on shape alone: a
 * well-formed `<uidb36>-<key>` renders the form, anything else renders the
 * template's `token_fail` branch.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Set New Password — Inkwell",
};

export default async function PasswordResetFromKeyPage({
  params,
}: PageProps<"/accounts/password/reset/key/[key]">) {
  const { key } = await params;
  const tokenFail = !/^[0-9a-z]+-[0-9A-Za-z]+/.test(key);

  return (
    <AuthShell>
      {tokenFail ? (
        <div className="flex flex-col items-center text-center">
          <ErrorBadge />
          <h1 className="text-2xl font-extrabold tracking-tight mb-3">Link expired</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            This password reset link is invalid or has already been used. Please request a new one.
          </p>
          <Link
            href={urls.accountResetPassword()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors block text-center"
          >
            Request a new link
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center text-center mb-8">
            <LockBadge />
            <h1 className="text-2xl font-extrabold tracking-tight mb-1.5">Set new password</h1>
            <p className="text-sm text-slate-500">Choose a strong password for your account.</p>
          </div>

          <SetPasswordForm />
        </>
      )}
    </AuthShell>
  );
}
