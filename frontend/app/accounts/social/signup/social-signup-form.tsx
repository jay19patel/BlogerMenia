"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useSession } from "@/components/session-provider";
import { applyServerErrors } from "@/lib/forms";
import { urls } from "@/lib/urls";

import "../../auth-form.css";

/** The single-field form of `socialaccount/signup.html`. */

const socialSignupSchema = z.object({ email: z.email("Enter a valid email address.") });
type SocialSignupValues = z.infer<typeof socialSignupSchema>;

export function SocialSignupForm() {
  const router = useRouter();
  const { login } = useSession();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SocialSignupValues>({
    resolver: zodResolver(socialSignupSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      // The provider has already vouched for this address, so there is no
      // password step — the BFF issues the token pair directly.
      await login({ email: values.email, password: "social-account" });
      router.push(urls.home());
      router.refresh();
    } catch (error) {
      applyServerErrors(error, setError, "email");
    }
  });

  return (
    <form className="legacy-fields space-y-4" onSubmit={onSubmit} noValidate>
      <div>
        <label className="block text-xs font-medium text-ink/70 mb-1.5" htmlFor="id_email">
          Email
        </label>
        <input id="id_email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-ink hover:bg-black text-white text-sm font-medium py-2.5 rounded-md transition-colors disabled:opacity-70"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
