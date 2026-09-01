"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

/**
 * The ACCOUNT block at the bottom of `partials/sidebar.html`, which swaps
 * between the profile/log-out pair and the login/sign-up pair.
 */
export function SidebarAccount({ active }: { active?: string }) {
  const { user, logout } = useSession();
  const router = useRouter();

  const activeClasses = "bg-brand-50 text-brand-700";
  const idleClasses = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

  if (user) {
    return (
      <>
        <Link
          href={urls.userProfile(user.username)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            active === "profile" ? activeClasses : idleClasses
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          My Profile
        </Link>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            logout();
            router.push(urls.home());
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link href={urls.accountLogin()} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        Login
      </Link>
      <Link href={urls.accountSignup()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        Sign up
      </Link>
    </>
  );
}

/** The same block as rendered by `partials/sidebar_detail.html` (no sign-up link). */
export function DetailSidebarAccount() {
  const { user, logout } = useSession();
  const router = useRouter();

  if (user) {
    return (
      <>
        <Link
          href={urls.userProfile(user.username)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          My Profile
        </Link>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            logout();
            router.push(urls.home());
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </form>
      </>
    );
  }

  return (
    <Link href={urls.accountLogin()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      Login
    </Link>
  );
}
