"use client";

/**
 * Shared brutalist search bar component.
 *
 * Props:
 *   value        — string
 *   onChange     — (e) => void
 *   onSubmit     — () => void  (called on button click or Enter key)
 *   placeholder  — string (optional)
 *   buttonLabel  — string (optional, defaults to "Exec")
 *   disabled     — boolean (optional)
 *   id           — string (optional, for accessibility)
 */
export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "QUERY INDEX...",
  buttonLabel = "Exec",
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
    <div className="relative border-2 border-foreground bg-background focus-within:ring-2 focus-within:ring-foreground transition-all flex h-14 shadow-[4px_4px_0px_0px_rgba(88,28,135,1)]">
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-6 py-3 bg-transparent text-foreground placeholder-gray-400 focus:outline-none font-mono uppercase text-sm disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="px-8 py-3 bg-foreground text-background font-bold uppercase tracking-widest hover:bg-purple-900 transition-all border-l-2 border-foreground disabled:opacity-50 disabled:cursor-not-allowed shrink-0 font-mono text-xs"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
