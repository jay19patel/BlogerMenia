import Link from "next/link";

import { IfAuthenticated } from "@/components/auth-gate";
import { SidebarAccount } from "@/components/sidebar-account";
import { misc } from "@/lib/api";
import { CATEGORY_DOT_CLASSES } from "@/lib/types";
import { urls } from "@/lib/urls";

/** `partials/sidebar.html` — the fixed left rail on every content page. */

const ACTIVE = "bg-brand-50 text-brand-700";
const IDLE = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

function navClass(isActive: boolean) {
  return `flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
    isActive ? ACTIVE : IDLE
  }`;
}

export type SidebarSection = "home" | "blog_list" | "playlists" | "community" | "write" | "profile" | "contact";

export async function SiteSidebar({
  active,
  activeCategory,
}: {
  active?: SidebarSection;
  activeCategory?: string;
}) {
  const allCategories = await misc.listCategories();

  return (
    <aside className="fixed top-16 left-0 bottom-0 w-64 border-r border-slate-200 bg-white overflow-y-auto hidden lg:block">
      <nav className="p-5 flex flex-col gap-6 h-full">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2 px-2">BROWSE</p>
          <ul className="flex flex-col gap-0.5">
            <li>
              <Link href={urls.home()} className={navClass(active === "home")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </Link>
            </li>
            <li>
              <Link href={urls.blogList()} className={navClass(active === "blog_list")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                All Blogs
              </Link>
            </li>
            <li>
              <Link href={urls.playlistList()} className={navClass(active === "playlists")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15V6" />
                  <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path d="M12 12H3" />
                  <path d="M16 6H3" />
                  <path d="M12 18H3" />
                </svg>
                Playlists
              </Link>
            </li>
            <li>
              <Link href={urls.userList()} className={navClass(active === "community")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Community
              </Link>
            </li>
          </ul>
        </div>

        {allCategories.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2 px-2">CATEGORIES</p>
            <ul className="flex flex-col gap-0.5">
              {allCategories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={urls.blogListByCategory(category.slug)}
                    className={navClass(activeCategory === category.slug)}
                  >
                    <span className={`w-2 h-2 rounded-full ${CATEGORY_DOT_CLASSES[category.color]}`} />
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
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2 px-2">WRITE</p>
            <ul className="flex flex-col gap-0.5">
              <li>
                <Link href={urls.blogCreate()} className={navClass(active === "write")}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pen-line">
                    <path d="M12 20h9" />
                    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                  </svg>
                  New Blog
                </Link>
              </li>
              <li>
                <Link
                  href={urls.playlistCreate()}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-video">
                    <path d="M12 12H3" />
                    <path d="M16 6H3" />
                    <path d="M12 18H3" />
                    <path d="m16 12 5 3-5 3v-6Z" />
                  </svg>
                  New Playlist
                </Link>
              </li>
            </ul>
          </div>
        </IfAuthenticated>

        <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-0.5">
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2 px-2">ACCOUNT</p>
          <SidebarAccount active={active} />
        </div>
      </nav>
    </aside>
  );
}
