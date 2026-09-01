"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SubmitArrow } from "@/components/auth-shell";
import { urls } from "@/lib/urls";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";

/** `account/password_reset.html`'s form. */
export function PasswordResetForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
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
        <Input
          id="id_email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          isInvalid={Boolean(error)}
          hint={error}
        />
      </div>

      <Button
        type="submit"
        color="primary"
        size="lg"
        className="w-full justify-center mt-2"
      >
        Send reset link
        <SubmitArrow />
      </Button>
    </form>
  );
}
