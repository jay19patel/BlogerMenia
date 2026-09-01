import type { Metadata } from "next";
import Link from "next/link";

import { urls } from "@/lib/urls";

import { SocialSignupForm } from "./social-signup-form";

/** Django: `/accounts/social/signup/` → django-allauth → `socialaccount/signup.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Complete Sign Up — Inkwell",
};

export default function SocialSignupPage() {
  return (
    <>
      <header className="h-16 border-b border-line bg-paper flex items-center justify-between px-6">
        <Link href={urls.home()} className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-sm bg-ink flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <span className="serif font-semibold text-[18px] tracking-tight">Inkwell</span>
        </Link>
      </header>

      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-16 bg-stone-50/60">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-line rounded-lg p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <span className="w-10 h-10 rounded-md bg-ink flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </span>
              <h1 className="serif text-2xl font-semibold tracking-tight mb-1.5">One last step</h1>
              <p className="text-sm text-muted">
                You&apos;re signing in with <strong className="text-ink">LinkedIn</strong>. Please
                complete the details below.
              </p>
            </div>

            <SocialSignupForm />
          </div>
        </div>
      </main>
    </>
  );
}
