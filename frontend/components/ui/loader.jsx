"use client";

export default function LoaderCard({ message = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 bg-card border border-border rounded-md px-6 py-4 shadow-sm">
      <span className="size-5 border-2 border-border border-t-primary rounded-full animate-spin shrink-0"></span>
      <span className="text-muted-foreground text-sm">{message}</span>
    </div>
  );
}
