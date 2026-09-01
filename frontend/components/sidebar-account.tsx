"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { LogInIcon, LogOutIcon, UserIcon, UserPlusIcon } from "@/components/nav-icons";
import { navRowClass } from "@/components/nav-link";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

/**
 * The ACCOUNT block at the bottom of `partials/sidebar.html`, which swaps
 * between the profile/log-out pair and the login/sign-up pair.
 *
 * `partials/sidebar_detail.html` rendered a second, near-identical copy of this
 * that omitted the sign-up link; the two have been folded together behind
 * `showSignup` so the log-out behaviour only exists once.
 */
export function SidebarAccount({
  active,
  showSignup = true,
}: {
  active?: string;
  showSignup?: boolean;
}) {
  const { user, logout } = useSession();
  const router = useRouter();

  if (user) {
    return (
      <>
        <Link
          href={urls.userProfile(user.username)}
          className={navRowClass(active === "profile")}
        >
          <UserIcon />
          My Profile
        </Link>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            logout();
            router.push(urls.home());
          }}
        >
          <button type="submit" className={`${navRowClass()} w-full`}>
            <LogOutIcon />
            Log out
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link href={urls.accountLogin()} className={navRowClass()}>
        <LogInIcon />
        Login
      </Link>
      {showSignup && (
        <Link href={urls.accountSignup()} className={navRowClass()}>
          <UserPlusIcon />
          Sign up
        </Link>
      )}
    </>
  );
}
