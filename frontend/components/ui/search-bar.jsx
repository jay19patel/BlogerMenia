"use client";

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search...",
  buttonLabel = "Search",
  disabled = false,
  id = "search-input",
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex h-11 rounded-md border border-border bg-muted/40 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all overflow-hidden">
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="px-5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
