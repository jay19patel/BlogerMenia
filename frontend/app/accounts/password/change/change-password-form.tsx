"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

import "../../auth-form.css";

/** allauth's `ChangePasswordForm` as rendered by `account/password_change.html`. */

const FIELDS = [
  { name: "oldpassword", id: "id_oldpassword", label: "Current Password" },
  { name: "password1", id: "id_password1", label: "New Password" },
  { name: "password2", id: "id_password2", label: "New Password (again)" },
] as const;

export function ChangePasswordForm() {
  const router = useRouter();
  const { user } = useSession();
  const { addMessage } = useMessages();
  const [values, setValues] = useState({ oldpassword: "", password1: "", password2: "" });
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="legacy-fields space-y-5"
      method="POST"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (values.password1 !== values.password2) {
          setError("You must type the same password each time.");
          return;
        }
        setError(null);
        addMessage("Static demo — the password was not changed.", "warning");
        router.push(user ? urls.userProfile(user.username) : urls.home());
      }}
    >
      {FIELDS.map((field) => (
        <div key={field.name}>
          <label className="block text-xs font-medium text-ink/70 mb-1.5" htmlFor={field.id}>
            {field.label}
          </label>
          <input
            id={field.id}
            name={field.name}
            type="password"
            autoComplete={field.name === "oldpassword" ? "current-password" : "new-password"}
            value={values[field.name]}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.name]: event.target.value }))
            }
          />
          {field.name === "password2" && error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2 border-t border-line">
        <button
          type="submit"
          className="bg-ink hover:bg-black text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
        >
          Update password
        </button>
        {user && (
          <Link
            href={urls.userProfile(user.username)}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
