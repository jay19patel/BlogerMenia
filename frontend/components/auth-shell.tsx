import Link from "next/link";
import type { ReactNode } from "react";

import { urls } from "@/lib/urls";
import { cn } from "@/lib/cn";
import { BrandLogo } from "@/components/brand-logo";

/**
 * The standalone chrome every django-allauth template in
 * `accounts/templates/account/` shares: a slim header with the BlogerMenia mark and
 * a "Back to Blogs" link, over a centred card.
 */
export function AuthShell({
  children,
  footer,
  centered = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  centered?: boolean;
}) {
  return (
    <>
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
        <BrandLogo />
        <Link href={urls.home()} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to Blogs
        </Link>
      </header>

      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-16 bg-slate-50/60">
        <div className="w-full max-w-md">
          <div
            className={cn(
              "bg-white border border-slate-200 rounded-2xl shadow-xs shadow-slate-200/60 p-8 sm:p-10",
              centered && "text-center",
            )}
          >
            {children}
          </div>
          {footer}
        </div>
      </main>
    </>
  );
}

/** The brand mark shown above the heading on the login and sign-up cards. */
export function AuthBadge() {
  return (
    <span className="w-12 h-12 rounded-2xl bg-linear-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-brand-500/25 mb-4">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M9 8h6" />
        <path d="M9 12h4" />
      </svg>
    </span>
  );
}

/** The padlock badge used by the password-reset cards. */
export function LockBadge() {
  return (
    <span className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  );
}

/** The green tick badge used by the "done" confirmation cards. */
export function SuccessBadge() {
  return (
    <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-6">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

/** The envelope badge used by the e-mail confirmation cards. */
export function MailBadge() {
  return (
    <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-6">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    </div>
  );
}

/** The red cross badge used by the expired-link cards. */
export function ErrorBadge() {
  return (
    <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    </div>
  );
}

/** The submit arrow repeated on every allauth call-to-action button. */
export function SubmitArrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
