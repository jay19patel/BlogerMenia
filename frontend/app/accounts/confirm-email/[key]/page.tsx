import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell, ErrorBadge, MailBadge, SubmitArrow } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

import { EmailConfirmForm } from "./confirm-form";

/**
 * Django: `/accounts/confirm-email/<key>/` → django-allauth →
 * `account/email_confirm.html`.
 *
 * The template branches on a confirmation record we have no store for, so the
 * two failure states are reachable with `?state=taken` and `?state=expired`;
 * any other request renders the confirmable state.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Confirm Email — BlogerMenia",
};

export default async function EmailConfirmPage({
  searchParams,
}: PageProps<"/accounts/confirm-email/[key]">) {
  const state = (await searchParams).state;

  if (state === "expired") {
    return (
      <AuthShell centered>
        <ErrorBadge />
        <h1 className="text-2xl font-extrabold tracking-tight mb-3">Link expired</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          This confirmation link has expired or is invalid. Please request a new one.
        </p>
        <Link
          href={urls.accountEmail()}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Request a new link
          <SubmitArrow />
        </Link>
      </AuthShell>
    );
  }

  if (state === "taken") {
    return (
      <AuthShell centered>
        <ErrorBadge />
        <h1 className="text-2xl font-extrabold tracking-tight mb-3">Already confirmed</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          This email address has already been confirmed by a different account.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell centered>
      <MailBadge />
      <EmailConfirmForm />
    </AuthShell>
  );
}
