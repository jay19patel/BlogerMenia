"use client";

import Link from "next/link";
import { Home, RefreshCcw, AlertTriangle } from "lucide-react";

export default function Error({ error, reset }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-background">
      <div className="bg-background border-2 border-foreground p-8 max-w-lg w-full text-center relative overflow-hidden group shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
        <div className="relative z-10">
            {/* Error Icon */}
            <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] flex items-center justify-center transform -rotate-6 group-hover:rotate-0 transition-transform">
                <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            </div>

            {/* Title */}
            <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3 uppercase tracking-tighter">
                ERROR.500
            </h1>
            <h2 className="text-lg font-mono font-bold text-foreground mb-3 uppercase tracking-widest bg-red-100 border-2 border-red-900 inline-block px-3 py-1">
                SYSTEM_FAULT
            </h2>
            <p className="text-sm font-mono text-gray-700 mb-1 uppercase tracking-widest mt-4">
                An unexpected system fault occurred.
            </p>
            </div>

            {/* Error Details (Only in Development) */}
            {process.env.NODE_ENV === "development" && error && (
            <div className="mb-6 p-3 bg-background border-2 border-red-900 text-left shadow-[4px_4px_0px_0px_rgba(153,27,27,1)]">
                <p className="text-xs font-mono font-bold text-red-900 break-words">
                [TRACE]: {error.message || "An unexpected error occurred"}
                </p>
            </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 border-t-2 border-foreground pt-6">
            <button
                onClick={() => reset()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs px-6 py-2.5 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
                <RefreshCcw className="w-4 h-4" />
                RETRY
            </button>
            <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-background text-foreground border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs px-6 py-2.5 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:bg-purple-900 hover:text-white hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
                <Home className="w-4 h-4" />
                HOME
            </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
