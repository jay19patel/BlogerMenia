"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LinkedInIcon } from "@/components/icons";
import { RawSvg } from "@/components/raw-svg";
import { useSession } from "@/components/session-provider";
import { apiFetch } from "@/lib/query/fetcher";
import { queryKeys } from "@/lib/query/keys";
import { urls } from "@/lib/urls";
import type { SearchResult } from "@/lib/types";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { User01, Edit05, Lock01, LogOut01, Plus } from "@untitledui/icons";

/** `partials/header.html` — the fixed top bar and its search dropdown. */

const KIND_ICON: Record<SearchResult["kind"], React.ReactElement> = {
  blog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M4 4h11a2 2 0 0 1 2 2v14a1 1 0 0 1-1.4.9L12 19l-3.6 1.9A1 1 0 0 1 7 20V6a2 2 0 0 0-2-2z" />
      <path d="M8 7h6M8 11h6" />
    </svg>
  ),
  playlist: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M3 6h13M3 12h13M3 18h9" />
      <path d="M18 12l4 2.5-4 2.5z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  ),
};

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export function SiteHeader({ mobileNav }: { mobileNav?: ReactNode }) {
  const { user } = useSession();
  const router = useRouter();

  const wrapRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // The panel is open whenever the query is long enough and the visitor has not
  // dismissed it (Escape, or a click outside the search box).
  const [dismissed, setDismissed] = useState(false);

  const trimmed = query.trim();
  const open = trimmed.length >= MIN_QUERY_LENGTH && !dismissed;
  const searching = trimmed.length >= MIN_QUERY_LENGTH && trimmed !== debouncedQuery;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    const timer = window.setTimeout(() => setDebouncedQuery(trimmed), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setDismissed(false);
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (event.key === "Escape") {
        setDismissed(true);
        inputRef.current?.blur();
      }
    }
    function onClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setDismissed(true);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.search(debouncedQuery),
    queryFn: () => apiFetch<SearchResponse>(`/api/search/?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60_000,
  });

  const results = data?.results ?? [];
  const showStatus = searching || isFetching || results.length === 0;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md z-40 flex items-center justify-between gap-2 px-4 sm:px-6 shadow-xs shadow-slate-100">
      {mobileNav}

      <Link href={urls.home()} className="flex items-center gap-2.5 group shrink-0">
        <span className="w-9 h-9 rounded-xl bg-linear-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M9 8h6" />
            <path d="M9 12h4" />
          </svg>
        </span>
        <span className="hidden text-[19px] font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-brand-600 sm:inline">
          Bloger<span className="text-brand-600">Menia</span>
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 items-center mx-1.5 sm:mx-4 lg:mx-8 lg:max-w-md">
        <form
          role="search"
          action={urls.search()}
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed.length < MIN_QUERY_LENGTH) return;
            setDismissed(true);
            router.push(urls.search(trimmed));
          }}
          className="relative w-full"
          ref={wrapRef}
        >
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            id="global-search"
            name="q"
            type="search"
            autoComplete="off"
            aria-label="Search blogs, playlists, people"
            placeholder="Search..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setDismissed(false);
            }}
            onFocus={() => setDismissed(false)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 sm:pr-14 text-sm text-slate-600 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-sm border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-400 mono sm:block">
            ⌘K
          </kbd>

          {open && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/60 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
              {showStatus && (
                <div className="px-4 py-3 text-sm text-slate-400">
                  {searching || isFetching ? "Searching..." : "No matches found."}
                </div>
              )}
              <div>
                {results.map((result) => (
                  <Link
                    key={`${result.kind}-${result.url}`}
                    href={result.url}
                    onClick={() => setDismissed(true)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 [&>svg]:w-full [&>svg]:h-full">
                      {result.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- matches the original dropdown markup.
                        <img src={result.image_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <RawSvg html={result.icon_html} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {result.title}
                        {result.posted_on_linkedin && result.linkedin_post_url ? (
                          <span className="inline-flex text-[#0A66C2] align-middle ml-1">
                            <LinkedInIcon />
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-slate-400 shrink-0" title={result.label}>
                      {KIND_ICON[result.kind]}
                    </span>
                  </Link>
                ))}
              </div>

              {results.length > 0 && (
                <Link
                  href={urls.search(trimmed)}
                  onClick={() => setDismissed(true)}
                  className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-brand-600 transition-colors hover:bg-slate-50"
                >
                  See all results for &ldquo;{trimmed}&rdquo;
                </Link>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Signed out, this slot is empty; the spacer keeps the search field from
          stretching into the space the avatar would occupy. */}
      <div className="flex shrink-0 items-center">
        {user && (
          <Dropdown.Root>
            <Dropdown.DotsButton aria-label="Profile menu">
              {user.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profile_picture}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent hover:ring-brand-500 transition-all"
                />
              ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-brand-500 transition-all [&>svg]:w-full [&>svg]:h-full">
                  <RawSvg html={user.avatar_svg} />
                </div>
              )}
            </Dropdown.DotsButton>
            <Dropdown.Popover>
              <Dropdown.Menu aria-label="User Profile">
                <Dropdown.Item href={urls.userProfile(user.username)} icon={User01}>
                  View Profile
                </Dropdown.Item>
                <Dropdown.Item href={urls.blogCreate()} icon={Plus}>
                  Write a Post
                </Dropdown.Item>
                <Dropdown.Item href={urls.profileEdit(user.username)} icon={Edit05}>
                  Edit Profile
                </Dropdown.Item>
                <Dropdown.Item href={urls.accountChangePassword()} icon={Lock01}>
                  Change Password
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item href={urls.accountLogout()} icon={LogOut01}>
                  Sign Out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        )}
      </div>
    </header>
  );
}
