import type { Metadata } from "next";

import { LinkedInIcon } from "@/components/linkedin-icon";
import { PageHeader } from "@/components/page-header";
import { ProfileBreadcrumb } from "@/components/profile-breadcrumb";
import { SiteSidebar } from "@/components/site-sidebar";
import { urls } from "@/lib/urls";

import { ConnectionsList } from "./connections-list";

/** Django: `/accounts/social/connections/` → django-allauth → `socialaccount/connections.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Connected Accounts — Inkwell",
};

/** `{% get_providers as socialaccount_providers %}` — LinkedIn is the only one configured. */
const PROVIDERS = [{ id: "linkedin_oauth2", name: "LinkedIn" }];

export default function ConnectionsPage() {
  return (
    <>
      <PageHeader />
      <SiteSidebar active="profile" />

      <main className="pt-16 lg:pl-64">
        <div className="max-w-2xl px-8 sm:px-14 py-14">
          <ProfileBreadcrumb current="Connected accounts" />

          <h1 className="text-2xl font-extrabold tracking-tight mb-8">Connected accounts</h1>

          <ConnectionsList />

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-bold text-slate-900 mb-4">Add a connection</h2>
            <div className="flex flex-wrap gap-3">
              {PROVIDERS.map((provider) => (
                <a
                  key={provider.id}
                  href={urls.linkedinLogin()}
                  className="inline-flex items-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  {provider.id === "linkedin_oauth2" && (
                    <span className="text-[#0A66C2]">
                      <LinkedInIcon className="w-[15px] h-[15px]" />
                    </span>
                  )}
                  {provider.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
