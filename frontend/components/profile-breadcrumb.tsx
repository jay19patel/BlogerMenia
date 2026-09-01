"use client";

import Link from "next/link";

import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

/**
 * The `Profile / <page>` breadcrumb the account settings templates render, which
 * only shows the Profile link when someone is signed in.
 */
export function ProfileBreadcrumb({
  current,
  wrapperClassName = "text-slate-400",
  linkClassName = "hover:text-slate-600",
}: {
  current: string;
  wrapperClassName?: string;
  linkClassName?: string;
}) {
  const { user } = useSession();

  return (
    <div className={`flex items-center gap-2 text-sm mb-6 ${wrapperClassName}`}>
      {user && (
        <>
          <Link href={urls.userProfile(user.username)} className={linkClassName}>
            Profile
          </Link>
          <span>/</span>
        </>
      )}
      <span>{current}</span>
    </div>
  );
}
