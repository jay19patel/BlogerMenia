import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { urls } from "@/lib/urls";

import { LogoutForm } from "./logout-form";

/** Django: `/accounts/logout/` → django-allauth → `account/logout.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Log out — Inkwell",
};

export default function LogoutPage() {
  return (
    <AuthShell centered>
      <h1 className="text-2xl font-extrabold tracking-tight mb-3">Log out?</h1>
      <p className="text-sm text-slate-500 mb-8">
        Are you sure you want to log out of your Inkwell account?
      </p>

      <div className="flex items-center justify-center gap-3">
        <Link
          href={urls.home()}
          className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-colors text-center"
        >
          Cancel
        </Link>
        <LogoutForm />
      </div>
    </AuthShell>
  );
}
