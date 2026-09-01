"use client";

import { useState } from "react";

import "highlight.js/styles/atom-one-dark.css";

/**
 * A `code` section from `blog/_blog_body.html`.
 *
 * The Django page loads highlight.js from a CDN and calls `highlightAll()` on
 * load; here the same library runs at build time and this component only keeps
 * the hover "Copy" affordance, so there is no unhighlighted flash.
 */
export function CodeBlock({
  language,
  highlightedHtml,
  plainCode,
}: {
  language: string;
  highlightedHtml: string;
  plainCode: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the code stays selectable by hand.
    }
  };

  return (
    <div className="relative group my-8 rounded-2xl overflow-hidden shadow-xs">
      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={copy}
          className="copy-btn bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium backdrop-blur-xs border border-white/10 transition-colors flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <pre className="m-0! p-5! text-[13px] leading-relaxed">
        <code
          className={`hljs language-${language}`}
          /* Markup produced by highlight.js from fixture source code — it emits
             only <span class="hljs-*"> wrappers around escaped text. */
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
}
