"use client";

import Link from "next/link";
import { Home, RefreshCcw, AlertTriangle } from "lucide-react";

export default function Error({ error, reset }) {
  return (
    <div className="min-h-[calc(100vh-20rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center">
        {/* Error Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
        </div>

        {/* 500 Title */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 mb-4">
            500
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Something Went Wrong
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            We&apos;re sorry, but something unexpected happened.
          </p>
          <p className="text-gray-500">
            Don&apos;t worry, our team has been notified and we&apos;re working on it.
          </p>
        </div>

        {/* Error Details (Only in Development) */}
        {process.env.NODE_ENV === "development" && error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <p className="text-sm font-mono text-red-800 break-words">
              {error.message || "An unexpected error occurred"}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            <RefreshCcw className="w-5 h-5" />
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg border-2 border-gray-300 hover:border-indigo-600 hover:text-indigo-600 transition-colors font-semibold"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            If the problem persists, please contact our support team.
          </p>
          <a
            href="mailto:support@BlogerMenia.com"
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
          >
            support@BlogerMenia.com
          </a>
        </div>
      </div>
    </div>
  );
}
