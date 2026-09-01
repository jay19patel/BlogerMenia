"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";

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
      className="space-y-5"
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
          <Input
            id={field.id}
            name={field.name}
            type="password"
            label={field.label}
            autoComplete={field.name === "oldpassword" ? "current-password" : "new-password"}
            value={values[field.name]}
            onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
            isInvalid={field.name === "password2" && Boolean(error)}
            hint={field.name === "password2" ? error : undefined}
          />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
        <Button
          type="submit"
          color="primary"
          size="md"
        >
          Update password
        </Button>
        {user && (
          <Link
            href={urls.userProfile(user.username)}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
