"use client";

export default function LoaderCard({ message = "Loading…" }) {
  return (
    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200">
      <span className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
      <span className="text-sm text-gray-700">{message}</span>
    </div>
  );
}


