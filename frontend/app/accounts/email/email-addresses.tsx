"use client";

import { useState } from "react";

import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";

import "../auth-form.css";

/**
 * `account/email.html` — the address list plus the "add address" form.
 *
 * allauth reads these from the `EmailAddress` table; here the signed-in fixture
 * account contributes its single verified primary address.
 */
export function EmailAddresses() {
  const { user } = useSession();
  const { addMessage } = useMessages();
  const [selected, setSelected] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");

  const addresses = user ? [{ email: user.email, verified: true, primary: true }] : [];
  const activeEmail = selected ?? addresses[0]?.email ?? null;

  return (
    <>
      {addresses.length > 0 && (
        <div className="bg-white border border-line rounded-lg p-6 mb-6">
          <p className="text-sm text-muted mb-4">Email addresses associated with your account:</p>
          <form
            method="POST"
            onSubmit={(event) => {
              event.preventDefault();
              addMessage("Static demo — email addresses are read-only here.", "warning");
            }}
          >
            <div className="space-y-3 mb-5">
              {addresses.map((address) => {
                const checked = activeEmail === address.email;
                return (
                  <label
                    key={address.email}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer ${
                      checked ? "border-accent bg-accent-soft" : "border-line hover:border-ink/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="email"
                      value={address.email}
                      checked={checked}
                      onChange={() => setSelected(address.email)}
                      className="accent-accent"
                      style={{ width: "auto", display: "inline" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{address.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {address.verified ? (
                          <span className="text-[10px] font-semibold text-accent bg-accent-soft px-1.5 py-0.5 rounded-sm">
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                            Unverified
                          </span>
                        )}
                        {address.primary && (
                          <span className="text-[10px] font-semibold text-muted bg-stone-100 px-1.5 py-0.5 rounded-sm">
                            Primary
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" name="action_primary" className="px-4 py-2 bg-ink hover:bg-black text-white text-sm font-medium rounded-md transition-colors">
                Make Primary
              </button>
              <button type="submit" name="action_send" className="px-4 py-2 border border-line hover:border-ink/30 text-ink text-sm font-medium rounded-md transition-colors">
                Re-send Verification
              </button>
              <button type="submit" name="action_remove" className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium rounded-md transition-colors">
                Remove
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-line rounded-lg p-6">
        <h2 className="serif text-lg font-semibold tracking-tight mb-4">Add email address</h2>
        <form
          className="legacy-fields space-y-4"
          method="POST"
          onSubmit={(event) => {
            event.preventDefault();
            addMessage("Static demo — email addresses are read-only here.", "warning");
            setNewEmail("");
          }}
        >
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1.5" htmlFor="id_email">
              New email address
            </label>
            <input
              id="id_email"
              name="email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </div>
          <button type="submit" name="action_add" className="px-4 py-2 bg-ink hover:bg-black text-white text-sm font-medium rounded-md transition-colors">
            Add Email
          </button>
        </form>
      </div>
    </>
  );
}
