"use client";

import { useEffect } from "react";

import "./pdf.css";

/**
 * Puts the document into the standalone mode `blog/pdf_template.html` renders
 * in — no site chrome — and opens the browser's print dialog, which is how a
 * static build produces the PDF the Celery task used to generate.
 */
export function PrintMode() {
  useEffect(() => {
    document.documentElement.classList.add("pdf-mode");
    const timer = window.setTimeout(() => window.print(), 400);
    return () => {
      document.documentElement.classList.remove("pdf-mode");
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <p className="pdf-print-hint text-center text-xs text-slate-400 pb-8">
      If the print dialog did not open, use your browser&apos;s Print command and choose
      &ldquo;Save as PDF&rdquo;.
    </p>
  );
}
