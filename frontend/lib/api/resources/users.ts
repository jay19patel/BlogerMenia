import "server-only";

import type { ZodType } from "zod";

import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import {
  blogSchema,
  currentUserSchema,
  paginated,
  playlistSummarySchema,
  userSchema,
  type Paginated,
  type ProfilePayload,
} from "@/lib/api/schemas";
import { MAX_PAGE_SIZE } from "@/lib/api/resources/blogs";
import { toBlog, toPlaylistSummary, toUser, toViewer } from "@/lib/models";
import type { Blog, PlaylistSummary, User, Viewer } from "@/lib/types";

const userPage = paginated(userSchema);
const blogPage = paginated(blogSchema);
const playlistPage = paginated(playlistSummarySchema);

/**
 * Walk every page of a paginated endpoint.
 *
 * `page_size` is capped server-side at `MAX_PAGE_SIZE`, so asking for 1000 —
 * which the sitemap and profile pages used to do — silently returned one page.
 */
async function allPages<Row, Model>(
  pageSchema: ZodType<Paginated<Row>>,
  path: string,
  map: (row: Row) => Model,
): Promise<Model[]> {
  const collected: Model[] = [];
  let page = 1;
  for (;;) {
    const data = await request(pageSchema, { path, query: { page, page_size: MAX_PAGE_SIZE } });
    collected.push(...data.results.map(map));
    if (!data.next) break;
    page += 1;
  }
  return collected;
}

/** `UserListView` — newest members first. */
export async function listUsers(): Promise<User[]> {
  const data = await request(userPage, {
    path: endpoints.users(),
    query: { page: 1, page_size: MAX_PAGE_SIZE },
    next: { tags: ["users"] },
  });
  return data.results.map(toUser);
}

export async function getUser(username: string): Promise<User | null> {
  try {
    return toUser(await request(userSchema, { path: endpoints.user(username) }));
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function listAllUsernames(): Promise<string[]> {
  const users = await allPages(userPage, endpoints.users(), toUser);
  return users.map((user) => user.username);
}

/** Everything the profile page renders. */
export async function getProfile(
  username: string,
): Promise<{ user: User; blogs: Blog[]; playlists: PlaylistSummary[] } | null> {
  const user = await getUser(username);
  if (!user) return null;

  const [blogs, playlists] = await Promise.all([
    allPages(blogPage, endpoints.userBlogs(username), toBlog),
    allPages(playlistPage, endpoints.userPlaylists(username), toPlaylistSummary),
  ]);

  return { user, blogs, playlists };
}

/** `GET /auth/me/` — requires a valid access token. */
export async function getCurrentUser(token: string | null): Promise<Viewer | null> {
  if (!token) return null;
  try {
    return toViewer(await request(currentUserSchema, { path: endpoints.currentUser(), token }));
  } catch (error) {
    if (error instanceof ApiError && (error.isUnauthorized || error.isNotFound)) return null;
    throw error;
  }
}

/** Your own profile. `currentUserSchema` because the API answers a self-view
 *  with the private fields included. */
export async function updateProfile(username: string, payload: ProfilePayload | FormData, token: string | null) {
  return request(currentUserSchema, {
    path: endpoints.user(username),
    method: "PATCH",
    body: payload,
    token,
  });
}

/** The viewer's bookmarks. */
export async function listSavedBlogs(token: string | null): Promise<Blog[]> {
  if (!token) return [];
  const data = await request(blogPage, {
    path: endpoints.savedBlogs(),
    query: { page_size: MAX_PAGE_SIZE },
    token,
  });
  return data.results.map(toBlog);
}
