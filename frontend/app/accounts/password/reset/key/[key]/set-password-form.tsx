"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SubmitArrow } from "@/components/auth-shell";
import { urls } from "@/lib/urls";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";

/** The `{% else %}` branch of `account/password_reset_from_key.html`. */
export function SetPasswordForm() {
  const router = useRouter();
  const [values, setValues] = useState({ password1: "", password2: "" });
  const [errors, setErrors] = useState<{ password1?: string; password2?: string }>({});

  const update = (field: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  return (
    <form
      className="space-y-4"
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
        <Input
          id="id_password1"
          name="password1"
          type="password"
          label="New Password"
          autoComplete="new-password"
          value={values.password1}
          onChange={update("password1")}
          isInvalid={Boolean(errors.password1)}
          hint={errors.password1}
        />
      </div>

      <div>
        <Input
          id="id_password2"
          name="password2"
          type="password"
          label="New Password (again)"
          autoComplete="new-password"
          value={values.password2}
          onChange={update("password2")}
          isInvalid={Boolean(errors.password2)}
          hint={errors.password2}
        />
      </div>

      <Button
        type="submit"
        color="primary"
        size="lg"
        className="w-full justify-center mt-2"
      >
        Set new password
        <SubmitArrow />
      </Button>
    </form>
  );
}
