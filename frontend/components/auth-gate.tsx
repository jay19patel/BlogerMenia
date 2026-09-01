"use client";

import type { ReactNode } from "react";

import { useSession } from "@/components/session-provider";

/** `{% if user.is_authenticated %}…{% endif %}` */
export function IfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSession();
  return isAuthenticated ? <>{children}</> : null;
}

/** `{% if not user.is_authenticated %}…{% endif %}` */
export function IfAnonymous({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSession();
  return isAuthenticated ? null : <>{children}</>;
}

/** `{% if user.is_authenticated %}…{% else %}…{% endif %}` */
export function AuthSwitch({
  authenticated,
  anonymous,
}: {
  authenticated: ReactNode;
  anonymous: ReactNode;
}) {
  const { isAuthenticated } = useSession();
  return <>{isAuthenticated ? authenticated : anonymous}</>;
}
