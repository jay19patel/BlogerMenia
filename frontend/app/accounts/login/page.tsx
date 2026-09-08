import type { Metadata } from "next";
import Link from "next/link";

import { AuthBadge, AuthShell } from "@/components/auth-shell";
import { LinkedInIcon } from "@/components/icons";
import { urls } from "@/lib/urls";

import { LoginForm } from "./login-form";

/** Django: `/accounts/login/` → django-allauth → `account/login.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Log in — BlogerMenia",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // `?error=social` is how `/api/auth/social/handoff` reports a handoff code
  // that had already been redeemed or had expired. Without this the failure is
  // an unexplained bounce back to this page.
  const socialFailed = (await searchParams).error === "social";

  return (
    <AuthShell
      footer={
        <p className="text-center text-sm text-slate-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href={urls.accountSignup()} className="font-semibold text-brand-600 hover:text-brand-700">
            Sign up for free
          </Link>
        </p>
      }
    >
      <div className="flex flex-col items-center text-center mb-8">
        <AuthBadge />
        <h1 className="text-2xl font-extrabold tracking-tight mb-1.5">Welcome back</h1>
        <p className="text-sm text-slate-500">
          Log in to write, bookmark, and follow your favorite authors.
        </p>
      </div>

      {socialFailed && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600 font-medium">
            That LinkedIn sign-in link had already been used or expired. Please try again.
          </p>
        </div>
      )}

      <LoginForm />

      <div className="flex items-center gap-3 my-6">
        <span className="h-px flex-1 bg-slate-100" />
        <span className="text-xs text-slate-400">or continue with</span>
        <span className="h-px flex-1 bg-slate-100" />
      </div>

      <a
        href={urls.linkedinLogin()}
        className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-medium text-slate-700 transition-colors"
      >
        <span className="text-[#0A66C2]">
          <LinkedInIcon className="w-5 h-5" />
        </span>
        Continue with LinkedIn
      </a>
    </AuthShell>
  );
}
