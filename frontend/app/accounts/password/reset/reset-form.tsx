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
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="space-y-4"
      method="POST"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError("Enter a valid email address.");
          return;
        }
        setError(null);
        setIsSubmitting(true);
        await new Promise((resolve) => setTimeout(resolve, 600));
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
          onChange={(val) => {
            setEmail(val);
            if (error) setError(null);
          }}
          isInvalid={Boolean(error)}
          hint={error}
        />
      </div>

      <Button
        type="submit"
        color="primary"
        size="lg"
        isDisabled={isSubmitting}
        className="w-full justify-center mt-2 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending reset link…
          </>
        ) : (
          <>
            Send reset link
            <SubmitArrow />
          </>
        )}
      </Button>
    </form>
  );
}
