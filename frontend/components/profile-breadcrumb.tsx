"use client";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

/**
 * The `Profile / <page>` trail the account settings templates render, which
 * only shows the Profile link when someone is signed in.
 *
 * A thin wrapper over `Breadcrumbs`: the crumbs depend on the session, which is
 * client-side, but the markup and structured data stay shared.
 */
export function ProfileBreadcrumb({ current }: { current: string }) {
  const { user } = useSession();

  return (
    <Breadcrumbs
      items={[
        ...(user ? [{ name: "Profile", href: urls.userProfile(user.username) }] : []),
        { name: current },
      ]}
    />
  );
}
