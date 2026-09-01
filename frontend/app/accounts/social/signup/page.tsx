import type { Metadata } from "next";

import { AuthBadge, AuthShell } from "@/components/auth-shell";

import { SocialSignupForm } from "./social-signup-form";

/** Django: `/accounts/social/signup/` → django-allauth → `socialaccount/signup.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Complete Sign Up — BlogerMenia",
};

export default function SocialSignupPage() {
  return (
    <AuthShell>
      {/*
        This page used to hand-roll its own header, card and badge — a near-copy
        of `AuthShell` with a different radius, a stone background and a serif
        heading, so the LinkedIn hand-off looked like a different site than the
        login page it follows.
      */}
      <div className="mb-8 flex flex-col items-center text-center">
        <AuthBadge />
        <h1 className="mb-1.5 text-2xl font-extrabold tracking-tight text-slate-900">One last step</h1>
        <p className="text-sm leading-relaxed text-slate-500">
          You&apos;re signing in with <strong className="font-semibold text-slate-900">LinkedIn</strong>.
          Please confirm your email address below.
        </p>
      </div>

      <SocialSignupForm />
    </AuthShell>
  );
}
