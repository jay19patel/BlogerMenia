"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { useIsHydrated } from "@/lib/use-is-hydrated";

/**
 * The sidebar as a mobile drawer.
 *
 * Rendered with `createPortal` to `document.body` so parent `backdrop-blur-md`
 * and fixed height constraints on `<header>` do not clip or trap the drawer dialog.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHydrated = useIsHydrated();
  const [state, setState] = useState({ isOpen: false, pathname });
  const isOpen = state.isOpen && state.pathname === pathname;

  const setIsOpen = (next: boolean) => setState({ isOpen: next, pathname });

  // Deriving `isOpen` from the path this way — rather than closing the drawer
  // from an effect — means a navigation that happens by any route (a link, the
  // back button) leaves it closed without a second render pass.
  if (state.pathname !== pathname && state.isOpen) setState({ isOpen: false, pathname });

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setState({ isOpen: false, pathname });
    };
    document.addEventListener("keydown", onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, pathname]);

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        // `inert` keeps the closed drawer out of the tab order and off the
        // accessibility tree while still allowing it to animate.
        inert={!isOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:hidden",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <span className="font-extrabold tracking-tight text-slate-900">
            Bloger<span className="text-brand-600">Menia</span>
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/*
          Closing is delegated rather than threaded through the nav as a
          callback: a route change already closes the drawer, but same-page
          activations (a table-of-contents anchor, the log-out button) do not
          change the path, so those are caught here.
        */}
        <div
          className="flex-1 overflow-y-auto"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a, button")) setIsOpen(false);
          }}
        >
          {children}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation"
        aria-expanded={isOpen}
        className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden cursor-pointer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isHydrated ? createPortal(drawerContent, document.body) : null}
    </>
  );
}
