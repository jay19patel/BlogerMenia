"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { SubmitArrow } from "@/components/auth-shell";
import { useSession } from "@/components/session-provider";
import { loginPayloadSchema, type LoginPayload } from "@/lib/api/schemas";
import { applyServerErrors } from "@/lib/forms";
import { urls } from "@/lib/urls";
import { FormInput } from "@/components/form-fields";
import { Checkbox } from "@/components/base/checkbox/checkbox";

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

  const {
    control,
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

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <FormInput
          control={control}
          name="email"
          id="id_login"
          type="email"
          label="Email address"
          autoComplete="email"
          placeholder="you@example.com"
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span />
            <a href={urls.accountResetPassword()} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </a>
          </div>
          <FormInput
            control={control}
            name="password"
            id="id_password"
            type="password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <div className="pt-1">
          <Checkbox
            id="id_remember"
            name="remember"
            label="Keep me signed in"
          />
        </div>

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
