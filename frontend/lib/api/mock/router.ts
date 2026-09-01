import "server-only";

import type { RequestOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { issueAccessToken, issueTokenPair, verifyToken } from "@/lib/api/mock/jwt";
import {
  blogs,
  categories,
  findBlog,
  findPlaylist,
  findUser,
  findUserByEmail,
  playlists,
  publishedBlogs,
  savedBlogIdsByUser,
  users,
} from "@/lib/api/mock/db";
import type { ApiBlog, Paginated, SearchResult } from "@/lib/api/schemas";

/**
 * The mock backend.
 *
 * Implements the endpoints in `lib/api/endpoints.ts` with DRF's semantics:
 * page-number pagination, `snake_case` payloads, `{"detail": …}` errors, 401 on
 * a missing bearer token. Writes are accepted and validated but not persisted —
 * the fixtures are read-only — which is called out in the UI where it matters.
 */

const PAGE_SIZE = 10;

/** Mirrors `rest_framework.pagination.PageNumberPagination`. */
function paginate<T>(items: T[], path: string, page: number, pageSize = PAGE_SIZE): Paginated<T> {
  const start = (page - 1) * pageSize;
  const results = items.slice(start, start + pageSize);
  const pageUrl = (n: number) => `${path}?page=${n}`;
  return {
    count: items.length,
    next: start + pageSize < items.length ? pageUrl(page + 1) : null,
    previous: page > 1 ? pageUrl(page - 1) : null,
    results,
  };
}

function notFound(): never {
  throw new ApiError(404, "Not found.");
}

async function requireAuth(token: string | null | undefined) {
  const claims = await verifyToken(token);
  if (!claims || claims.token_type !== "access") {
    throw new ApiError(401, "Given token not valid for any token type.");
  }
  const user = users.find((candidate) => candidate.id === claims.user_id);
  if (!user) throw new ApiError(401, "User not found.");
  return user;
}

function likedIdsFor(): number[] {
  // Likes are per-visitor and live in the browser; the fixtures record only totals.
  return [];
}

function matchesSearch(result: SearchResult, needle: string): boolean {
  return `${result.title} ${result.subtitle}`.toLowerCase().includes(needle);
}

function buildSearchIndex(): SearchResult[] {
  return [
    ...publishedBlogs.map<SearchResult>((blog) => ({
      kind: "blog",
      label: "Blog",
      title: blog.title,
      subtitle: blog.excerpt || blog.subtitle || blog.content.replace(/<[^>]*>/g, "").slice(0, 90),
      url: `/blogs/${blog.slug}/`,
      image_url: blog.image,
      icon_html: blog.image ? "" : blog.avatar_svg,
      posted_on_linkedin: blog.posted_on_linkedin,
      linkedin_post_url: blog.linkedin_post_url,
    })),
    ...playlists.map<SearchResult>((playlist) => ({
      kind: "playlist",
      label: "Playlist",
      title: playlist.title,
      subtitle: playlist.description,
      url: `/playlists/${playlist.slug}/`,
      image_url: playlist.image,
      icon_html: playlist.image ? "" : playlist.avatar_svg,
    })),
    ...users.map<SearchResult>((user) => ({
      kind: "profile",
      label: "Person",
      title: `${user.first_name} ${user.last_name}`.trim() || user.username,
      subtitle: `@${user.username}`,
      url: `/profile/${user.username}/`,
      image_url: user.profile_picture,
      icon_html: user.profile_picture ? "" : user.avatar_svg,
    })),
  ];
}

const searchIndex = buildSearchIndex();

/** Route a request to the fixture that answers it. */
export async function mockRequest(options: RequestOptions): Promise<unknown> {
  const { path, method = "GET", query = {}, body, token } = options;
  const page = Math.max(1, Number(query.page ?? 1) || 1);

  /* ------------------------------------------------------------------ auth */

  if (path === "/token/" && method === "POST") {
    const { email, password } = (body ?? {}) as { email?: string; password?: string };
    if (!email) throw new ApiError(400, "This field is required.", { email: ["This field is required."] });
    if (!password) throw new ApiError(400, "This field is required.", { password: ["This field is required."] });

    // Fixtures carry no password hashes, so any password is accepted and the
    // address selects which seeded account you sign in as.
    const user = findUserByEmail(email) ?? users[0];
    return issueTokenPair(user);
  }

  if (path === "/token/refresh/" && method === "POST") {
    const { refresh } = (body ?? {}) as { refresh?: string };
    const claims = await verifyToken(refresh);
    if (!claims || claims.token_type !== "refresh") {
      throw new ApiError(401, "Token is invalid or expired.");
    }
    const user = users.find((candidate) => candidate.id === claims.user_id);
    if (!user) throw new ApiError(401, "User not found.");
    return { access: await issueAccessToken(user) };
  }

  if (path === "/auth/register/" && method === "POST") {
    const { email } = (body ?? {}) as { email?: string };
    if (!email) throw new ApiError(400, "This field is required.", { email: ["This field is required."] });
    const user = findUserByEmail(email) ?? users[0];
    return issueTokenPair(user);
  }

  if (path === "/users/me/") {
    const user = await requireAuth(token);
    return {
      ...user,
      saved_blog_ids: savedBlogIdsByUser.get(user.id) ?? [],
      liked_blog_ids: likedIdsFor(),
    };
  }

  /* -------------------------------------------------------------- taxonomy */

  if (path === "/categories/") return { count: categories.length, next: null, previous: null, results: categories };

  /* ------------------------------------------------------------------ blogs */

  if (path === "/blogs/" && method === "GET") {
    let items: ApiBlog[] = publishedBlogs;
    if (query.category) items = items.filter((blog) => blog.category?.slug === query.category);
    if (query.author) items = items.filter((blog) => blog.author.username === query.author);
    if (query.tag) {
      const tag = String(query.tag).toLowerCase();
      items = items.filter((blog) => blog.tags.some((entry) => entry.toLowerCase() === tag));
    }
    if (query.featured === true || query.featured === "true") items = items.filter((blog) => blog.featured);
    if (query.ordering === "-read_count") {
      items = [...items].sort(
        (a, b) => b.read_count - a.read_count || Date.parse(b.created_at) - Date.parse(a.created_at),
      );
    }
    if (query.exclude) items = items.filter((blog) => blog.slug !== query.exclude);
    const size = Number(query.page_size ?? PAGE_SIZE) || PAGE_SIZE;
    return paginate(items, "/blogs/", page, size);
  }

  const blogMatch = /^\/blogs\/([^/]+)\/$/.exec(path);
  if (blogMatch && method === "GET") return findBlog(blogMatch[1]) ?? notFound();

  const likeMatch = /^\/blogs\/([^/]+)\/like\/$/.exec(path);
  if (likeMatch && method === "POST") {
    await requireAuth(token);
    const blog = findBlog(likeMatch[1]) ?? notFound();
    return { liked: true, like_count: blog.like_count + 1 };
  }

  const saveMatch = /^\/blogs\/([^/]+)\/save\/$/.exec(path);
  if (saveMatch && method === "POST") {
    await requireAuth(token);
    if (!findBlog(saveMatch[1])) notFound();
    return { saved: true };
  }

  const shareMatch = /^\/blogs\/([^/]+)\/share-linkedin\/$/.exec(path);
  if (shareMatch && method === "POST") {
    await requireAuth(token);
    if (!findBlog(shareMatch[1])) notFound();
    return { detail: "Your blog is being shared to LinkedIn and will appear shortly." };
  }

  if (path === "/blogs/" && method === "POST") {
    await requireAuth(token);
    throw new ApiError(503, "Static demo — the post was not saved.");
  }
  if (blogMatch && (method === "PATCH" || method === "PUT")) {
    await requireAuth(token);
    throw new ApiError(503, "Static demo — the post was not saved.");
  }
  if (blogMatch && method === "DELETE") {
    await requireAuth(token);
    throw new ApiError(503, "Static demo — nothing was deleted, the fixture data is read-only.");
  }

  /* -------------------------------------------------------------- playlists */

  if (path === "/playlists/" && method === "GET") {
    let items = playlists;
    if (query.author) items = items.filter((playlist) => playlist.author.username === query.author);
    return paginate(items, "/playlists/", page, Number(query.page_size ?? 12) || 12);
  }

  const playlistMatch = /^\/playlists\/([^/]+)\/$/.exec(path);
  if (playlistMatch && method === "GET") return findPlaylist(playlistMatch[1]) ?? notFound();

  if (path === "/playlists/" && method === "POST") {
    await requireAuth(token);
    throw new ApiError(503, "Static demo — the playlist was not saved.");
  }
  if (playlistMatch && (method === "PATCH" || method === "PUT")) {
    await requireAuth(token);
    throw new ApiError(503, "Static demo — the playlist was not saved.");
  }
  if (playlistMatch && method === "DELETE") {
    await requireAuth(token);
    throw new ApiError(503, "Static demo — nothing was deleted, the fixture data is read-only.");
  }

  /* ------------------------------------------------------------------ users */

  if (path === "/users/" && method === "GET") {
    const ordered = [...users].sort((a, b) => Date.parse(b.date_joined) - Date.parse(a.date_joined));
    return paginate(ordered, "/users/", page, Number(query.page_size ?? 24) || 24);
  }

  const savedMatch = path === "/users/me/saved-blogs/";
  if (savedMatch && method === "GET") {
    const user = await requireAuth(token);
    const ids = savedBlogIdsByUser.get(user.id) ?? [];
    const items = blogs.filter((blog) => ids.includes(blog.id) && blog.is_published);
    return paginate(items, "/users/me/saved-blogs/", page, 100);
  }

  const userBlogsMatch = /^\/users\/([^/]+)\/blogs\/$/.exec(path);
  if (userBlogsMatch) {
    const user = findUser(userBlogsMatch[1]) ?? notFound();
    const items = publishedBlogs.filter((blog) => blog.author.id === user.id);
    return paginate(items, path, page, 100);
  }

  const userPlaylistsMatch = /^\/users\/([^/]+)\/playlists\/$/.exec(path);
  if (userPlaylistsMatch) {
    const user = findUser(userPlaylistsMatch[1]) ?? notFound();
    const items = playlists.filter((playlist) => playlist.author.id === user.id);
    return paginate(items, path, page, 100);
  }

  const userMatch = /^\/users\/([^/]+)\/$/.exec(path);
  if (userMatch && method === "GET") return findUser(userMatch[1]) ?? notFound();

  if (userMatch && method === "PATCH") {
    await requireAuth(token);
    throw new ApiError(503, "Static demo — profile changes are not saved.");
  }

  /* --------------------------------------------------------- search, contact */

  if (path === "/search/") {
    const raw = String(query.q ?? "").trim();
    if (raw.length < 2) return { query: raw, results: [] };
    const needle = raw.toLowerCase();
    return {
      query: raw,
      results: searchIndex.filter((result) => matchesSearch(result, needle)).slice(0, 8),
    };
  }

  if (path === "/contact/" && method === "POST") {
    return { detail: "Message sent successfully." };
  }

  throw new ApiError(404, `No mock handler for ${method} ${path}.`);
}
