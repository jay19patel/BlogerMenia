"use client";

import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";

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
      <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">No third-party accounts connected yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
      <p className="text-sm text-slate-500 mb-4">You can sign in using these connected accounts:</p>
      <form
        method="POST"
        onSubmit={(event) => {
          event.preventDefault();
          addMessage("Static demo — connections cannot be changed here.", "warning");
        }}
      >
        <div className="space-y-3 mb-5">
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
                className="shrink-0"
                style={{ width: "auto", display: "inline" }}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{account.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{account.brand}</p>
              </div>
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors"
        >
          Disconnect selected
        </button>
      </form>
    </div>
  );
}
