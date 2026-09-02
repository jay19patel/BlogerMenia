"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { SubmitArrow } from "@/components/auth-shell";
import { useSession } from "@/components/session-provider";
import { signupPayloadSchema, type SignupPayload } from "@/lib/api/schemas";
import { applyServerErrors } from "@/lib/forms";
import { urls } from "@/lib/urls";
import { FormInput } from "@/components/form-fields";

/**
 * `account/signup.html` — allauth's `ACCOUNT_SIGNUP_FIELDS` of
 * `email*, password1*, password2*`, with Django's default password-validator
 * help text under the first password field.
 *
 * `ACCOUNT_EMAIL_VERIFICATION` is "none" upstream, so a successful sign-up logs
 * straight in and lands on the home page.
 */

const PASSWORD_HELP = [
  "Your password can’t be too similar to your other personal information.",
  "Your password must contain at least 8 characters.",
  "Your password can’t be a commonly used password.",
  "Your password can’t be entirely numeric.",
];

export function SignupForm() {
  const router = useRouter();
  const { signup } = useSession();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<SignupPayload>({
    resolver: zodResolver(signupPayloadSchema),
    defaultValues: { email: "", password1: "", password2: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signup(values);
      router.push(urls.home());
      router.refresh();
    } catch (error) {
      applyServerErrors(error, setError, "email");
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <FormInput
        control={control}
        name="email"
        id="id_email"
        type="email"
        label="Email"
        autoComplete="email"
      />

      <FormInput
        control={control}
        name="password1"
        id="id_password1"
        type="password"
        label="Password"
        autoComplete="new-password"
        hint={
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {PASSWORD_HELP.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        }
      />

      <FormInput
        control={control}
        name="password2"
        id="id_password2"
        type="password"
        label="Password (again)"
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-70 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating account…
          </>
        ) : (
          <>
            Create account
            <SubmitArrow />
          </>
        )}
      </button>
    </form>
  );
}
