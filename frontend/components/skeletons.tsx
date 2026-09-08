import { cn } from "@/lib/cn";

/**
 * Loading placeholders for the `loading.tsx` boundaries.
 *
 * There were none, so with a 10-second API timeout a slow backend left the
 * reader on the previous page with no feedback at all. These mirror the real
 * layouts closely enough that the swap-in isn't a jump.
 */

export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-100", className)}
      aria-hidden="true"
    />
  );
}

export function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <Shimmer className="h-44 rounded-none" />
      <div className="space-y-3 p-5">
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-5 w-4/5" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-2/3" />
        <div className="flex items-center gap-3 pt-2">
          <Shimmer className="size-8 rounded-full" />
          <Shimmer className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function BlogListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2"
      role="status"
      aria-label="Loading articles"
    >
      {Array.from({ length: count }, (_, index) => (
        <BlogCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading article">
      <Shimmer className="h-4 w-32" />
      <Shimmer className="h-10 w-11/12" />
      <Shimmer className="h-10 w-2/3" />
      <div className="flex items-center gap-3 py-4">
        <Shimmer className="size-10 rounded-full" />
        <div className="space-y-2">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-3 w-20" />
        </div>
      </div>
      <Shimmer className="h-72 rounded-2xl" />
      <div className="space-y-3 pt-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Shimmer key={index} className={index % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading profile">
      <div className="flex items-center gap-5">
        <Shimmer className="size-20 rounded-2xl" />
        <div className="space-y-3">
          <Shimmer className="h-6 w-48" />
          <Shimmer className="h-4 w-32" />
        </div>
      </div>
      <Shimmer className="h-4 w-full" />
      <Shimmer className="h-4 w-3/4" />
      <BlogListSkeleton count={2} />
    </div>
  );
}
