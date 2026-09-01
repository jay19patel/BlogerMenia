import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { LogOutIcon } from "@/components/nav-icons";
import { urls } from "@/lib/urls";

import { LogoutForm } from "./logout-form";

/** Django: `/accounts/logout/` → django-allauth → `account/logout.html` */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Log out — BlogerMenia",
};

export default function LogoutPage() {
  return (
    <AuthShell centered>
      <span className="mx-auto mb-6 flex size-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500">
        <LogOutIcon width={22} height={22} />
      </span>

      <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900">Log out?</h1>
      <p className="mb-8 text-sm leading-relaxed text-slate-500">
        Are you sure you want to log out of your BlogerMenia account?
      </p>

      <div className="flex items-center justify-center gap-3">
        <Link
          href={urls.home()}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300"
        >
          Cancel
        </Link>
        <LogoutForm />
      </div>
    </AuthShell>
  );
}
