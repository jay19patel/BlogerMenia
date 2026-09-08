import "server-only";

import { request, requestVoid } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { MAX_PAGE_SIZE } from "@/lib/api/resources/blogs";
import {
  paginated,
  playlistSchema,
  playlistSummarySchema,
  type PlaylistPayload,
} from "@/lib/api/schemas";
import { toPlaylist, toPlaylistSummary } from "@/lib/models";
import type { Playlist, PlaylistSummary } from "@/lib/types";

/** The list endpoint returns summaries — it does not expand every post of
 *  every playlist. Only the detail endpoint carries `blogs`. */
const playlistPage = paginated(playlistSummarySchema);

export const PLAYLIST_PAGE_SIZE = 12;

export async function listPlaylists(
  params: { page?: number; author?: string; pageSize?: number } = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(params.pageSize ?? PLAYLIST_PAGE_SIZE, MAX_PAGE_SIZE);
  const data = await request(playlistPage, {
    path: endpoints.playlists(),
    query: { page, page_size: pageSize, author: params.author },
    next: { tags: ["playlists"] },
  });
  return {
    playlists: data.results.map(toPlaylistSummary),
    count: data.count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(data.count / pageSize)),
  };
}

/** Detail — this really does include the playlist's posts now. */
export async function getPlaylist(slug: string): Promise<Playlist | null> {
  try {
    return toPlaylist(
      await request(playlistSchema, { path: endpoints.playlist(slug), next: { tags: [`playlist:${slug}`] } }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/** Every playlist, paging through as needed. */
export async function listAllPlaylists(): Promise<PlaylistSummary[]> {
  const collected: PlaylistSummary[] = [];
  let page = 1;
  for (;;) {
    const data = await request(playlistPage, {
      path: endpoints.playlists(),
      query: { page, page_size: MAX_PAGE_SIZE },
    });
    collected.push(...data.results.map(toPlaylistSummary));
    if (!data.next) break;
    page += 1;
  }
  return collected;
}

export async function listAllPlaylistSlugs(): Promise<string[]> {
  return (await listAllPlaylists()).map((playlist) => playlist.slug);
}

export async function createPlaylist(payload: PlaylistPayload, token: string | null) {
  return request(playlistSchema, { path: endpoints.playlists(), method: "POST", body: payload, token });
}

export async function updatePlaylist(slug: string, payload: PlaylistPayload, token: string | null) {
  return request(playlistSchema, { path: endpoints.playlist(slug), method: "PATCH", body: payload, token });
}

export async function deletePlaylist(slug: string, token: string | null) {
  return requestVoid({ path: endpoints.playlist(slug), method: "DELETE", token });
}
