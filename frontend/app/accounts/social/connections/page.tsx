import type { Metadata } from "next";

import { LinkedInIcon } from "@/components/icons";
import { SettingsCard } from "@/components/settings-card";
import { SettingsPage } from "@/components/settings-page";
import { urls } from "@/lib/urls";

import { ConnectionsList } from "./connections-list";

/** Django: `/accounts/social/connections/` → django-allauth → `socialaccount/connections.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Connected Accounts — BlogerMenia",
};

/** `{% get_providers as socialaccount_providers %}` — LinkedIn is the only one configured. */
const PROVIDERS = [{ id: "linkedin_oauth2", name: "LinkedIn" }];

export default function ConnectionsPage() {
  return (
    <SettingsPage
      current="Connected accounts"
      title="Connected accounts"
      description="Sign in with a third-party account, and publish your posts straight to it."
    >
      <ConnectionsList />

      <SettingsCard title="Add a connection">
        <div className="flex flex-wrap gap-3">
          {PROVIDERS.map((provider) => (
            <a
              key={provider.id}
              href={urls.linkedinLogin()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {provider.id === "linkedin_oauth2" && (
                <span className="text-[#0A66C2]">
                  <LinkedInIcon className="size-4" />
                </span>
              )}
              {provider.name}
            </a>
          ))}
        </div>
      </SettingsCard>
    </SettingsPage>
  );
}
