import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { LinkedInPostedBadge } from "@/components/icons";
import { PageContainer, PageShell } from "@/components/page-shell";
import { RawSvg } from "@/components/raw-svg";
import { misc } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";
import type { SearchResult } from "@/lib/types";

/**
 * `/search/?q=…` — the results page behind the header's dropdown.
 *
 * Search previously existed only as that dropdown, so pressing Enter did
 * nothing and a search could not be linked to or shared. It also left the
 * site-level `SearchAction` in `components/json-ld.tsx` pointing at
 * `/blogs/?q=…`, a URL that ignored the parameter — Google was being told about
 * a search endpoint that did not work. This is that endpoint.
 */

const MIN_QUERY_LENGTH = 2;

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const query = firstParam((await searchParams).q)?.trim() ?? "";
  return buildMetadata({
    title: query ? `Search: ${query} — BlogerMenia` : "Search — BlogerMenia",
    description: "Search articles, playlists and writers on BlogerMenia.",
    path: urls.search(query || undefined),
    // A results page is thin content and should not compete with the articles.
    noIndex: true,
  });
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  blog: "Article",
  playlist: "Playlist",
  profile: "Writer",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const query = firstParam((await searchParams).q)?.trim() ?? "";
  const results = query.length >= MIN_QUERY_LENGTH ? await misc.search(query) : [];

  return (
    <PageShell>
      <PageContainer className="max-w-4xl">
        <Breadcrumbs items={[{ name: "Home", href: urls.home() }, { name: "Search" }]} />

        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search"}
        </h1>
        <p className="mt-2 mb-10 text-slate-500">
          {query.length >= MIN_QUERY_LENGTH
            ? `${results.length} result${results.length === 1 ? "" : "s"}`
            : "Use the search box in the header to find articles, playlists and writers."}
        </p>

        {query.length >= MIN_QUERY_LENGTH && results.length === 0 ? (
          <EmptyState
            title="No matches"
            message={`Nothing matched “${query}”. Try a shorter or more general term.`}
            action={
              <Link
                href={urls.blogList()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Browse all articles
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {results.map((result) => (
              <li key={`${result.kind}-${result.url}`}>
                <Link
                  href={result.url}
                  className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-slate-50/60"
                >
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 [&>svg]:h-full [&>svg]:w-full">
                    {result.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- matches the dropdown's markup.
                      <img src={result.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <RawSvg html={result.icon_html} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 text-[11px] font-semibold tracking-wider text-slate-400">
                      {KIND_LABEL[result.kind]}
                    </p>
                    <p className="truncate font-bold text-slate-900 transition-colors group-hover:text-brand-700">
                      {result.title}
                      <LinkedInPostedBadge
                        postedOnLinkedin={result.posted_on_linkedin ?? false}
                        linkedinPostUrl={result.linkedin_post_url ?? null}
                      />
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{result.subtitle}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </PageShell>
  );
}
