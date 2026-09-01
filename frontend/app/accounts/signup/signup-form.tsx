"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { SubmitArrow } from "@/components/auth-shell";
import { useSession } from "@/components/session-provider";
import { signupPayloadSchema, type SignupPayload } from "@/lib/api/schemas";
import { applyServerErrors } from "@/lib/forms";
import { urls } from "@/lib/urls";

import "../auth-form.css";

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
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
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
    <form className="auth-fields space-y-4" onSubmit={onSubmit} noValidate>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="id_email">
          Email
        </label>
        <input id="id_email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="id_password1">
          Password
        </label>
        <input
          id="id_password1"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password1)}
          {...register("password1")}
        />
        {errors.password1 && <p className="mt-1 text-xs text-red-500">{errors.password1.message}</p>}
        <div className="mt-1 text-xs text-slate-400">
          <ul>
            {PASSWORD_HELP.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="id_password2">
          Password (again)
        </label>
        <input
          id="id_password2"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password2)}
          {...register("password2")}
        />
        {errors.password2 && <p className="mt-1 text-xs text-red-500">{errors.password2.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
        <SubmitArrow />
      </button>
    </form>
  );
}
