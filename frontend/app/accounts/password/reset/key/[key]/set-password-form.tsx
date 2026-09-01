"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SubmitArrow } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

import "../../../../auth-form.css";

/** The `{% else %}` branch of `account/password_reset_from_key.html`. */
export function SetPasswordForm() {
  const router = useRouter();
  const [values, setValues] = useState({ password1: "", password2: "" });
  const [errors, setErrors] = useState<{ password1?: string; password2?: string }>({});

  const update = (field: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  return (
    <form
      className="auth-fields space-y-4"
      method="POST"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors: typeof errors = {};
        if (values.password1.length < 8)
          nextErrors.password1 = "This password is too short. It must contain at least 8 characters.";
        if (values.password1 !== values.password2)
          nextErrors.password2 = "You must type the same password each time.";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        router.push(urls.accountResetPasswordFromKeyDone());
      }}
    >
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="id_password1">
          New Password
        </label>
        <input
          id="id_password1"
          name="password1"
          type="password"
          autoComplete="new-password"
          value={values.password1}
          onChange={update("password1")}
        />
        {errors.password1 && <p className="mt-1 text-xs text-red-500">{errors.password1}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="id_password2">
          New Password (again)
        </label>
        <input
          id="id_password2"
          name="password2"
          type="password"
          autoComplete="new-password"
          value={values.password2}
          onChange={update("password2")}
        />
        {errors.password2 && <p className="mt-1 text-xs text-red-500">{errors.password2}</p>}
      </div>

      <button
        type="submit"
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
      >
        Set new password
        <SubmitArrow />
      </button>
    </form>
  );
}
