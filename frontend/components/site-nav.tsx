import Link from "next/link";

import { IfAuthenticated } from "@/components/auth-gate";
import {
  BooksIcon,
  CommunityIcon,
  HomeIcon,
  ListVideoIcon,
  PenLineIcon,
  PlaylistIcon,
} from "@/components/nav-icons";
import { NavHeading, NavLink, navRowClass } from "@/components/nav-link";
import { SidebarAccount } from "@/components/sidebar-account";
import { Toc } from "@/components/toc";
import type { TocEntry } from "@/lib/blog";
import { CATEGORY_DOT_CLASSES, type Category } from "@/lib/types";
import { urls } from "@/lib/urls";

/**
 * `partials/sidebar.html` — the navigation itself, without the box it sits in.
 *
 * The desktop rail and the mobile drawer both render this, and article pages add
 * their table of contents to it. Previously the article pages had a separate
 * `sidebar_detail` copy that duplicated the BROWSE and ACCOUNT blocks while
 * dropping Community, the categories and the WRITE section; there is now one
 * navigation, so every page offers the same routes.
 */

export type SidebarSection =
  "home" | "blog_list" | "playlists" | "community" | "write" | "profile" | "contact";

export function SiteNav({
  categories,
  active,
  activeCategory,
  toc,
}: {
  categories: Category[];
  active?: SidebarSection;
  activeCategory?: string;
  /** Article pages pass their headings; fewer than two renders no TOC. */
  toc?: TocEntry[];
}) {
  const tocEntries = toc && toc.length >= 2 ? toc : [];

  return (
    <div className="flex h-full flex-col gap-5 p-4 pb-8">
      <nav aria-label="Browse" className="flex flex-col gap-5">
        <div>
          <NavHeading>BROWSE</NavHeading>
          <ul className="flex flex-col gap-0.5">
            <NavLink href={urls.home()} icon={HomeIcon} isActive={active === "home"}>
              Home
            </NavLink>
            <NavLink href={urls.blogList()} icon={BooksIcon} isActive={active === "blog_list"}>
              All Blogs
            </NavLink>
            <NavLink href={urls.playlistList()} icon={PlaylistIcon} isActive={active === "playlists"}>
              Playlists
            </NavLink>
            <NavLink href={urls.userList()} icon={CommunityIcon} isActive={active === "community"}>
              Community
            </NavLink>
          </ul>
        </div>

        {tocEntries.length > 0 && (
          <div>
            <NavHeading>ON THIS PAGE</NavHeading>
            <Toc entries={tocEntries} />
          </div>
        )}

        {categories.length > 0 && (
          <div>
            <NavHeading>CATEGORIES</NavHeading>
            <ul className="flex flex-col gap-0.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={urls.blogListByCategory(category.slug)}
                    className={navRowClass(activeCategory === category.slug)}
                  >
                    <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT_CLASSES[category.color]}`} />
                    {category.name}
                    <span className="ml-auto text-[11px] text-slate-400">{category.blog_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <IfAuthenticated>
          <div>
            <NavHeading>WRITE</NavHeading>
            <ul className="flex flex-col gap-0.5">
              <NavLink href={urls.blogCreate()} icon={PenLineIcon} isActive={active === "write"}>
                New Blog
              </NavLink>
              <NavLink href={urls.playlistCreate()} icon={ListVideoIcon}>
                New Playlist
              </NavLink>
            </ul>
          </div>
        </IfAuthenticated>
      </nav>

      <nav aria-label="Account" className="mt-auto flex flex-col gap-0.5 border-t border-slate-200 pt-4 pb-2">
        <NavHeading>ACCOUNT</NavHeading>
        <SidebarAccount active={active} />
      </nav>
    </div>
  );
}
