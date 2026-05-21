"use client";

export default function LoaderCard({ message = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 bg-background px-6 py-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
      <span className="h-5 w-5 border-2 border-foreground border-r-transparent animate-spin"></span>
      <span className="font-mono font-bold text-sm uppercase tracking-widest text-foreground">{message}</span>
    </div>
  );
}


