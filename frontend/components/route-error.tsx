"use client";

import { useEffect } from "react";

import { Button } from "@/components/base/buttons/button";
import { PageContainer } from "@/components/page-container";

/**
 * The body of a route-level `error.tsx`.
 *
 * Every route with a data fetch needs one. Without it, any thrown `ApiError` —
 * including a schema mismatch at the transport boundary — escalates to the
 * full-page `global-error` screen, replacing the whole app shell for what is
 * usually one failed request.
 *
 * `retry` (not `reset`) is this version of Next's recovery prop; it re-renders
 * the segment inside a Transition, so state outside the boundary survives.
 */
export function RouteError({
  error,
  retry,
  title = "This didn't load",
  message = "Something went wrong fetching this page. It may be a temporary problem with the API.",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  message?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer className="max-w-2xl">
      <div className="py-20 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-slate-500">{message}</p>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="md" color="primary" onClick={() => retry()}>
            Try again
          </Button>
          <Button size="md" color="secondary" href="/">
            Back to home
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
