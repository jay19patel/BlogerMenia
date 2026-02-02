import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-20rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            Oops! The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <p className="text-gray-500">
            It might have been moved or deleted, or perhaps you mistyped the URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          <Link
            href="/blogs"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg border-2 border-gray-300 hover:border-indigo-600 hover:text-indigo-600 transition-colors font-semibold"
          >
            <Search className="w-5 h-5" />
            Browse Blogs
          </Link>
        </div>

        {/* Popular Pages */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">You might be looking for:</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
            >
              Home
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/blogs"
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
            >
              All Blogs
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
            >
              Login
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/register"
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
