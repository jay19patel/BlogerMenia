"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useSession } from "@/components/session-provider";
import { applyServerErrors } from "@/lib/forms";
import { urls } from "@/lib/urls";
import { FormInput } from "@/components/form-fields";
import { Button } from "@/components/base/buttons/button";

/** The single-field form of `socialaccount/signup.html`. */

const socialSignupSchema = z.object({ email: z.email("Enter a valid email address.") });
type SocialSignupValues = z.infer<typeof socialSignupSchema>;

export function SocialSignupForm() {
  const router = useRouter();
  const { login } = useSession();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
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
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <FormInput
        control={control}
        name="email"
        id="id_email"
        type="email"
        label="Email"
        autoComplete="email"
      />

      <Button
        type="submit"
        color="primary"
        size="lg"
        isDisabled={isSubmitting}
        className="w-full justify-center mt-2"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
