"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared brutalist pagination component.
 *
 * Props:
 *   currentPage  — number (1-indexed)
 *   totalPages   — number
 *   onPageChange — (page: number) => void
 *   disabled     — boolean (optional) — grays out all buttons during fetching
 */
export default function Pagination({ currentPage, totalPages, onPageChange, disabled = false }) {
  if (totalPages <= 1) return null;

  const getPaginationRange = (current, total) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let pages = [1, 2, 3];
    pages.push(total - 2, total - 1, total);
    if (current > 1 && current < total) {
      pages.push(current - 1, current, current + 1);
    }

    pages = [...new Set(pages)].filter((p) => p > 0 && p <= total).sort((a, b) => a - b);

    const result = [];
    for (let i = 0; i < pages.length; i++) {
      if (i > 0 && pages[i] - pages[i - 1] > 1) {
        result.push("...");
      }
      result.push(pages[i]);
    }
    return result;
  };

  const range = getPaginationRange(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-2 mt-12 font-mono">
      {/* Prev */}
      <button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1 || disabled}
        aria-label="Previous page"
        className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground text-foreground font-mono font-bold uppercase tracking-widest text-[10px] hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
        Prev
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {range.map((page, index) => {
          if (page === "...") {
            return (
              <span key={`dots-${index}`} className="px-2 text-foreground font-bold text-sm">
                ...
              </span>
            );
          }
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={disabled}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
              className={`w-10 h-10 flex items-center justify-center border-2 border-foreground font-bold text-sm transition-all ${
                currentPage === page
                  ? "bg-foreground text-background shadow-[2px_2px_0px_0px_rgba(88,28,135,1)]"
                  : "bg-background text-foreground hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next */}
      <button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages || disabled}
        aria-label="Next page"
        className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground text-foreground font-mono font-bold uppercase tracking-widest text-[10px] hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
