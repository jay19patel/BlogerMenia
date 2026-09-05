import { cn } from "@/lib/cn";
import { CATEGORY_DOT_CLASSES } from "@/lib/types";
import type { Category } from "@/lib/types";

/**
 * The category pill on a card, an article header or a track row.
 */

const BORDER_MAP: Record<string, string> = {
  blue: "border-blue-200 bg-blue-50/80 text-blue-700",
  rose: "border-rose-200 bg-rose-50/80 text-rose-700",
  amber: "border-amber-200 bg-amber-50/80 text-amber-700",
  purple: "border-purple-200 bg-purple-50/80 text-purple-700",
  teal: "border-teal-200 bg-teal-50/80 text-teal-700",
  indigo: "border-indigo-200 bg-indigo-50/80 text-indigo-700",
};

export function CategoryBadge({
  category,
  fallback = "Article",
  className,
}: {
  category: Category | null;
  /** Shown when the post has no category; `null` renders nothing at all. */
  fallback?: string | null;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-normal border shadow-2xs transition-colors whitespace-nowrap w-fit self-start";

  if (!category) {
    if (fallback === null) return null;
    return (
      <span className={cn(base, "bg-slate-50 text-slate-600 border-slate-200", className)}>
        <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
        <span>{fallback}</span>
      </span>
    );
  }

  const colorClasses = BORDER_MAP[category.color] ?? `${category.bg_class} ${category.text_class} border-slate-200`;
  const dotColor = CATEGORY_DOT_CLASSES[category.color] ?? "bg-slate-400";

  return (
    <span className={cn(base, colorClasses, className)}>
      <span className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
      <span>{category.name}</span>
    </span>
  );
}
