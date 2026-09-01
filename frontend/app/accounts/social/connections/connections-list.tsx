"use client";

import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/empty-state";
import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";
import { SettingsCard } from "@/components/settings-card";

/**
 * The connected-accounts list of `socialaccount/connections.html`. A fixture
 * account with `has_linkedin_oauth` contributes the one connection allauth
 * would list; everyone else sees the empty state.
 */
export function ConnectionsList() {
  const { user } = useSession();
  const { addMessage } = useMessages();

  const accounts = user?.has_linkedin_oauth
    ? [{ id: String(user.id), label: user.display_name, brand: "LinkedIn" }]
    : [];

  if (accounts.length === 0) {
    return (
      <SettingsCard className="p-0 sm:p-0">
        <EmptyState
          variant="plain"
          icon={
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          }
          message="No third-party accounts connected yet."
        />
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="Connected" description="You can sign in using these accounts.">
      <form
        method="POST"
        onSubmit={(event) => {
          event.preventDefault();
          addMessage("Static demo — connections cannot be changed here.", "warning");
        }}
      >
        <div className="mb-5 flex flex-col gap-3">
          {accounts.map((account) => (
            <label
              key={account.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name="account"
                value={account.id}
                defaultChecked
                className="size-4 shrink-0 accent-brand-600"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{account.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{account.brand}</p>
              </div>
            </label>
          ))}
        </div>
        <Button type="submit" size="md" color="secondary-destructive">
          Disconnect selected
        </Button>
      </form>
    </SettingsCard>
  );
}
