"use client";

import type { ReactNode } from "react";

import { useSession } from "@/components/session-provider";

/** `{% if user == object.author %}…{% endif %}` */
export function OwnerOnly({ username, children }: { username: string; children: ReactNode }) {
  const { user } = useSession();
  return user?.username === username ? <>{children}</> : null;
}

/**
 * `{% if blog.is_published or user == blog.author %}` — public rows render for
 * everyone, drafts only for the person who wrote them.
 */
export function VisibleToOwnerOrPublic({
  isPublished,
  username,
  children,
}: {
  isPublished: boolean;
  username: string;
  children: ReactNode;
}) {
  const { user } = useSession();
  if (isPublished) return <>{children}</>;
  return user?.username === username ? <>{children}</> : null;
}
