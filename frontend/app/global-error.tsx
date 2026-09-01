"use client";

import { Inter } from "next/font/google";

import "./globals.css";

/**
 * Django: `blogermenia/templates/500.html`.
 *
 * Standalone on purpose — the original renders with an empty context, so it
 * carries its own `<html>` document and its own font, and shows no chrome.
 */

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export default function GlobalError() {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <title>Something went wrong — BlogerMenia</title>
      </head>
      <body className="bg-white text-slate-900 antialiased">
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md py-20">
            <p className="text-[120px] leading-none font-extrabold tracking-tight text-slate-200 select-none">
              500
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-2">
              Something went wrong
            </h1>
            <p className="text-slate-500 mt-3 leading-relaxed">
              An unexpected error occurred on our end. Please try again in a moment.
            </p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
                the error boundary replaces the app shell, so this must be a full
                page load rather than a client-side transition. */}
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors mt-8"
            >
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
