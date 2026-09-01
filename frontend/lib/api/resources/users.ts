import "server-only";

import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import {
  blogSchema,
  currentUserSchema,
  paginated,
  playlistSchema,
  userSchema,
  type ProfilePayload,
} from "@/lib/api/schemas";
import { toBlog, toPlaylist, toUser, toViewer } from "@/lib/models";
import type { Blog, Playlist, User, Viewer } from "@/lib/types";

const userPage = paginated(userSchema);
const blogPage = paginated(blogSchema);
const playlistPage = paginated(playlistSchema);

/** `UserListView` — newest members first. */
export async function listUsers(params: { page?: number } = {}): Promise<User[]> {
  const data = await request(userPage, {
    path: endpoints.users(),
    query: { page: Math.max(1, params.page ?? 1), page_size: 100 },
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
  const data = await request(userPage, { path: endpoints.users(), query: { page_size: 1000 } });
  return data.results.map((user) => user.username);
}

/** `UserProfileView.get_context_data` — everything the profile page renders. */
export async function getProfile(
  username: string,
): Promise<{ user: User; blogs: Blog[]; playlists: Playlist[] } | null> {
  const user = await getUser(username);
  if (!user) return null;

  const [blogs, playlists] = await Promise.all([
    request(blogPage, { path: endpoints.userBlogs(username), query: { page_size: 1000 } }),
    request(playlistPage, { path: endpoints.userPlaylists(username), query: { page_size: 1000 } }),
  ]);

  return { user, blogs: blogs.results.map(toBlog), playlists: playlists.results.map(toPlaylist) };
}

/** `GET /users/me/` — requires a valid access token. */
export async function getCurrentUser(token: string | null): Promise<Viewer | null> {
  if (!token) return null;
  try {
    return toViewer(await request(currentUserSchema, { path: endpoints.currentUser(), token }));
  } catch (error) {
    if (error instanceof ApiError && (error.isUnauthorized || error.isNotFound)) return null;
    throw error;
  }
}

export async function updateProfile(username: string, payload: ProfilePayload, token: string | null) {
  return request(userSchema, { path: endpoints.user(username), method: "PATCH", body: payload, token });
}
