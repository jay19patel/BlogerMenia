import type { ReactNode } from "react";

import { PageContainer, PageShell } from "@/components/page-shell";
import { ProfileBreadcrumb } from "@/components/profile-breadcrumb";

/**
 * The shell shared by the account-settings pages.
 *
 * These three pages were each laid out by hand and had drifted apart: two used
 * a `font-serif text-3xl font-semibold` heading against the site's
 * `font-extrabold tracking-tight`, one used `rounded-lg` cards against
 * `rounded-2xl` everywhere else, and none of them carried the eyebrow label
 * that every other page in the app puts above its title. One shell keeps them
 * looking like the same website.
 */
export function SettingsPage({
  current,
  title,
  description,
  children,
}: {
  /** The final breadcrumb, and the page's own name. */
  current: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <PageShell active="profile">
      <PageContainer className="max-w-2xl">
        <ProfileBreadcrumb current={current} />

        <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400">
          ACCOUNT SETTINGS
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 leading-relaxed text-slate-500">{description}</p>}

        <div className="mt-8 flex flex-col gap-6">{children}</div>
      </PageContainer>
    </PageShell>
  );
}

