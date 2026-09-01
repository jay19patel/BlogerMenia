import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

/** Django: `/accounts/inactive/` → django-allauth → `account/account_inactive.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Account Disabled — BlogerMenia",
};

export default function AccountInactivePage() {
  return (
    <AuthShell centered>
      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-6">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M4.93 4.93l14.14 14.14" />
        </svg>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight mb-3">Account disabled</h1>
      <p className="text-sm text-slate-500 leading-relaxed mb-6">
        This account has been disabled. Please contact support if you believe this is a mistake.
      </p>

      <Link
        href={urls.home()}
        className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center justify-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Back to home
      </Link>
    </AuthShell>
  );
}
