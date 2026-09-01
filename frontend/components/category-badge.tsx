import { cn } from "@/lib/cn";
import type { Category } from "@/lib/types";

/**
 * The category pill on a card, an article header or a track row.
 *
 * `{% if blog.category %}…{% else %}<span>ARTICLE</span>{% endif %}` appeared
 * six times across the listing, detail, related-post and profile markup, each
 * copy with slightly different padding and a different fallback word. The
 * fallback label stays a prop because the templates genuinely differ there.
 */
export function CategoryBadge({
  category,
  fallback = "ARTICLE",
  className,
}: {
  category: Category | null;
  /** Shown when the post has no category; `null` renders nothing at all. */
  fallback?: string | null;
  className?: string;
}) {
  const base = "text-[11px] font-bold tracking-wide rounded-full px-2.5 py-1 uppercase";

  if (!category) {
    if (fallback === null) return null;
    return <span className={cn(base, "bg-slate-100 text-slate-500", className)}>{fallback}</span>;
  }

  return (
    <span className={cn(base, category.text_class, category.bg_class, className)}>{category.name}</span>
  );
}
