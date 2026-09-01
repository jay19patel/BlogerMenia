import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { urls } from "@/lib/urls";

/** Django: `blogermenia/templates/404.html` */

export const metadata: Metadata = {
  title: "Page not found — Inkwell",
};

export default function NotFound() {
  return (
    <>
      <PageHeader />

      <main className="pt-16 min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md py-20">
          <p className="text-[120px] leading-none font-extrabold tracking-tight bg-linear-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent select-none">
            404
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-2">Page not found</h1>
          <p className="text-slate-500 mt-3 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved or deleted.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link
              href={urls.home()}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
              Back to home
            </Link>
            <Link
              href={urls.blogList()}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Browse blogs
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
