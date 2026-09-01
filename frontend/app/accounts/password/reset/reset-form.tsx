"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SubmitArrow } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

import "../../auth-form.css";

/** `account/password_reset.html`'s form. */
export function PasswordResetForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="auth-fields space-y-4"
      method="POST"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError("Enter a valid email address.");
          return;
        }
        router.push(urls.accountResetPasswordDone());
      }}
    >
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="id_email">
          Email address
        </label>
        <input
          id="id_email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      <button
        type="submit"
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
      >
        Send reset link
        <SubmitArrow />
      </button>
    </form>
  );
}
