"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { SubmitArrow } from "@/components/auth-shell";
import { useSession } from "@/components/session-provider";
import { loginPayloadSchema, type LoginPayload } from "@/lib/api/schemas";
import { applyServerErrors } from "@/lib/forms";
import { urls } from "@/lib/urls";

import "../auth-form.css";

/**
 * `account/login.html`'s form, validated by the same zod schema the API layer
 * uses for the request body.
 *
 * The seeded fixtures carry no password hashes, so the mock backend accepts any
 * password and the address chooses which account you sign in as. Swapping to
 * SimpleJWT changes nothing here — the credentials go to `POST /api/auth/login`
 * either way, and the tokens never reach this component.
 */
export function LoginForm() {
  const router = useRouter();
  const { login } = useSession();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginPayloadSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      router.push(urls.home());
      router.refresh();
    } catch (error) {
      applyServerErrors(error, setError, "email");
    }
  });

  return (
    <>
      {errors.root && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600 font-medium">{errors.root.message}</p>
        </div>
      )}

      <form className="auth-fields space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="id_login">
            Email address
          </label>
          <input
            id="id_login"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-600" htmlFor="id_password">
              Password
            </label>
            <a href={urls.accountResetPassword()} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              id="id_password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ paddingRight: "2.75rem" }}
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 pt-1">
          <input
            id="id_remember"
            name="remember"
            type="checkbox"
            style={{ width: "auto", display: "inline" }}
            className="rounded-sm border-slate-300"
          />
          Keep me signed in
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
          <SubmitArrow />
        </button>
      </form>
    </>
  );
}
