import Link from "next/link";

/**
 * Previous / page-count / Next, as `blog_list.html` renders it.
 *
 * `baseQuery` carries any filter that must survive the page change (the
 * category, a tag) and is expected to already end in `&` when non-empty.
 */
export function Pagination({
  page,
  totalPages,
  baseQuery = "",
}: {
  page: number;
  totalPages: number;
  baseQuery?: string;
}) {
  if (totalPages <= 1) return null;

  const step = "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50";

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-3">
      {page > 1 && (
        <Link href={`?${baseQuery}page=${page - 1}`} rel="prev" className={step}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="m12 5-7 7 7 7" />
          </svg>
          Previous
        </Link>
      )}

      <span className="px-2 text-sm text-slate-400 mono" aria-current="page">
        {page} / {totalPages}
      </span>

      {page < totalPages && (
        <Link href={`?${baseQuery}page=${page + 1}`} rel="next" className={step}>
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      )}
    </nav>
  );
}
