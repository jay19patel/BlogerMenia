"use client";

/**
 * Shared brutalist category filter pills.
 *
 * Props:
 *   categories       — string[]
 *   selectedCategory — string
 *   onSelect         — (category: string) => void
 */
export default function CategoryPills({ categories, selectedCategory, onSelect }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          aria-pressed={selectedCategory === category}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-widest font-bold transition-all border-2 border-foreground ${
            selectedCategory === category
              ? "bg-foreground text-background shadow-[4px_4px_0px_0px_rgba(88,28,135,1)]"
              : "bg-background text-foreground hover:bg-purple-900 hover:text-white hover:shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] hover:-translate-y-0.5 hover:-translate-x-0.5"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
