"use client";

export default function CategoryPills({ categories, selectedCategory, onSelect }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          aria-pressed={selectedCategory === category}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
            selectedCategory === category
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-transparent"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
