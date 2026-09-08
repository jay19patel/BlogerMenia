import type {
  ApiAuthor,
  ApiBlog,
  ApiPlaylist,
  ApiUser,
  CurrentUser,
  Category as ApiCategory,
  PlaylistSummary as ApiPlaylistSummary,
} from "@/lib/api/schemas";
import {
  CATEGORY_COLORS,
  type Author,
  type Blog,
  type Category,
  type Playlist,
  type PlaylistSummary,
  type User,
  type Viewer,
} from "@/lib/types";

/** Wire DTO → view model. Pure functions, safe on the server or the client. */

function names(dto: { first_name: string; last_name: string; username: string }) {
  const fullName = `${dto.first_name} ${dto.last_name}`.trim();
  return { full_name: fullName, display_name: fullName || dto.username };
}

export function toCategory(dto: ApiCategory): Category {
  const [textClass, bgClass] = CATEGORY_COLORS[dto.color] ?? CATEGORY_COLORS.blue;
  return { ...dto, text_class: textClass, bg_class: bgClass };
}

export function toAuthor(dto: ApiAuthor): Author {
  return { ...dto, ...names(dto) };
}

export function toUser(dto: ApiUser): User {
  return { ...dto, ...names(dto) };
}

export function toViewer(dto: CurrentUser): Viewer {
  return { ...toUser(dto), email: dto.email, auto_post_to_linkedin: dto.auto_post_to_linkedin, saved_blog_ids: dto.saved_blog_ids, liked_blog_ids: dto.liked_blog_ids };
}

export function toPlaylistSummary(dto: ApiPlaylistSummary): PlaylistSummary {
  return { ...dto, author: toAuthor(dto.author) };
}

export function toBlog(dto: ApiBlog): Blog {
  return {
    ...dto,
    author: toAuthor(dto.author),
    category: dto.category ? toCategory(dto.category) : null,
    playlists: dto.playlists.map(toPlaylistSummary),
  };
}

export function toPlaylist(dto: ApiPlaylist): Playlist {
  return { ...toPlaylistSummary(dto), blogs: dto.blogs.map(toBlog) };
}
