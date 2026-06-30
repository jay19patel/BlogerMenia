"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="flex items-center justify-center gap-1.5 mt-12">
      <button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1 || disabled}
        aria-label="Previous page"
        className={cn(
          "flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        <ChevronLeft className="size-4" />
        Prev
      </button>

      <div className="flex items-center gap-1">
        {range.map((page, index) => {
          if (page === "...") {
            return (
              <span key={`dots-${index}`} className="px-2 text-muted-foreground text-sm">
                …
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
              className={cn(
                "size-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages || disabled}
        aria-label="Next page"
        className={cn(
          "flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        Next
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
