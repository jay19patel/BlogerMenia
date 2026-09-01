"use client";

import { useState } from "react";

import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";
import { SettingsCard } from "@/components/settings-card";
import { cn } from "@/lib/cn";

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

  const readOnly = () => addMessage("Static demo — email addresses are read-only here.", "warning");

  const tag = "rounded px-1.5 py-0.5 text-[10px] font-semibold";

  return (
    <>
      {addresses.length > 0 && (
        <SettingsCard
          title="Your addresses"
          description="Select an address to manage it."
        >
          <form
            method="POST"
            onSubmit={(event) => {
              event.preventDefault();
              readOnly();
            }}
          >
            <div className="mb-5 flex flex-col gap-3">
              {addresses.map((address) => {
                const checked = activeEmail === address.email;
                return (
                  <label
                    key={address.email}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
                      checked
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="email"
                      value={address.email}
                      checked={checked}
                      onChange={() => setSelected(address.email)}
                      className="size-4 shrink-0 accent-brand-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{address.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {address.verified ? (
                          <span className={cn(tag, "bg-emerald-50 text-emerald-700")}>Verified</span>
                        ) : (
                          <span className={cn(tag, "bg-amber-50 text-amber-700")}>Unverified</span>
                        )}
                        {address.primary && (
                          <span className={cn(tag, "bg-slate-100 text-slate-500")}>Primary</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="action_primary" size="md" color="primary">
                Make primary
              </Button>
              <Button type="submit" name="action_send" size="md" color="secondary">
                Re-send verification
              </Button>
              <Button type="submit" name="action_remove" size="md" color="secondary-destructive">
                Remove
              </Button>
            </div>
          </form>
        </SettingsCard>
      )}

      <SettingsCard title="Add an email address">
        <form
          className="flex flex-col gap-4"
          method="POST"
          onSubmit={(event) => {
            event.preventDefault();
            readOnly();
            setNewEmail("");
          }}
        >
          <Input
            id="id_email"
            name="email"
            type="email"
            label="New email address"
            placeholder="you@example.com"
            value={newEmail}
            onChange={setNewEmail}
          />
          <Button type="submit" name="action_add" size="md" color="primary" className="w-fit">
            Add email
          </Button>
        </form>
      </SettingsCard>
    </>
  );
}
