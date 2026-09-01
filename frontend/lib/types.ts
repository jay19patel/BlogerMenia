import type {
  ApiBlog,
  ApiPlaylist,
  ApiUser,
  Category as ApiCategory,
  PlaylistSummary as ApiPlaylistSummary,
} from "@/lib/api/schemas";

/**
 * View models.
 *
 * These extend the wire DTOs in `lib/api/schemas.ts` with the few derived
 * values the templates read — `display_name`, the category colour classes —
 * which are presentation concerns and so are computed here rather than asked
 * of the backend. `lib/models.ts` does the mapping.
 */

export type { BlogSection, FlowchartStep, SearchResult, SectionLink, SectionType } from "@/lib/api/schemas";

export type CategoryColor = ApiCategory["color"];

/** `blog.models.CATEGORY_COLORS` — [text class, background class] per colour. */
export const CATEGORY_COLORS: Record<CategoryColor, readonly [string, string]> = {
  blue: ["text-blue-600", "bg-blue-50"],
  rose: ["text-rose-600", "bg-rose-50"],
  amber: ["text-amber-600", "bg-amber-50"],
  purple: ["text-purple-600", "bg-purple-50"],
  teal: ["text-teal-600", "bg-teal-50"],
  indigo: ["text-indigo-600", "bg-indigo-50"],
};

/** The dot colour the sidebar renders beside each category. */
export const CATEGORY_DOT_CLASSES: Record<CategoryColor, string> = {
  blue: "bg-blue-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
};

export interface Category extends ApiCategory {
  text_class: string;
  bg_class: string;
}

export interface User extends ApiUser {
  /** `get_full_name()` — empty when neither name part is set. */
  full_name: string;
  /** `{{ user.get_full_name|default:user.username }}` */
  display_name: string;
}

export interface PlaylistSummary extends Omit<ApiPlaylistSummary, "author"> {
  author: User;
}

export interface Blog extends Omit<ApiBlog, "author" | "category" | "playlists"> {
  author: User;
  category: Category | null;
  playlists: PlaylistSummary[];
}

export interface Playlist extends Omit<ApiPlaylist, "author" | "blogs"> {
  author: User;
  blogs: Blog[];
}

/**
 * One row of the playlist editor's blog picker — the subset of `Blog` that is
 * actually sent to the browser, so a playlist page does not ship every post's
 * full body. `lib/picker.ts` does the narrowing.
 */
export interface PlaylistPickerBlog {
  id: number;
  title: string;
  image: string | null;
  avatar_svg: string;
  category_name: string | null;
  created_at_label: string;
  author_username: string;
}

/** The signed-in viewer, including their own like and bookmark sets. */
export interface Viewer extends User {
  saved_blog_ids: number[];
  liked_blog_ids: number[];
}
