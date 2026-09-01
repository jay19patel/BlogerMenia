import type { Metadata } from "next";
import Link from "next/link";

import { AuthBadge, AuthShell } from "@/components/auth-shell";
import { LinkedInIcon } from "@/components/linkedin-icon";
import { urls } from "@/lib/urls";

import { SignupForm } from "./signup-form";

/** Django: `/accounts/signup/` → django-allauth → `account/signup.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Sign up — Inkwell",
};

export default function SignupPage() {
  return (
    <AuthShell
      footer={
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href={urls.accountLogin()} className="font-semibold text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </p>
      }
    >
      <div className="flex flex-col items-center text-center mb-8">
        <AuthBadge />
        <h1 className="text-2xl font-extrabold tracking-tight mb-1.5">Create an account</h1>
        <p className="text-sm text-slate-500">Start writing and reading on Inkwell today.</p>
      </div>

      <SignupForm />

      <div className="flex items-center gap-3 my-6">
        <span className="h-px flex-1 bg-slate-100" />
        <span className="text-xs text-slate-400">or sign up with</span>
        <span className="h-px flex-1 bg-slate-100" />
      </div>

      <a
        href={urls.linkedinLogin()}
        className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-medium text-slate-700 transition-colors"
      >
        <span className="text-[#0A66C2]">
          <LinkedInIcon className="w-4 h-4" />
        </span>
        Continue with LinkedIn
      </a>
    </AuthShell>
  );
}
