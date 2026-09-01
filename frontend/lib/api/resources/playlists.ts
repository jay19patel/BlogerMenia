import "server-only";

import { request, requestVoid } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { paginated, playlistSchema, type PlaylistPayload } from "@/lib/api/schemas";
import { toPlaylist } from "@/lib/models";
import type { Playlist } from "@/lib/types";

const playlistPage = paginated(playlistSchema);

/** Mirrors `PlaylistListView.paginate_by`. */
export const PLAYLIST_PAGE_SIZE = 12;

export async function listPlaylists(params: { page?: number; author?: string; pageSize?: number } = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? PLAYLIST_PAGE_SIZE;
  const data = await request(playlistPage, {
    path: endpoints.playlists(),
    query: { page, page_size: pageSize, author: params.author },
    next: { tags: ["playlists"] },
  });
  return {
    playlists: data.results.map(toPlaylist),
    count: data.count,
    page,
    totalPages: Math.max(1, Math.ceil(data.count / pageSize)),
  };
}

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

export async function listAllPlaylistSlugs(): Promise<string[]> {
  const data = await request(playlistPage, { path: endpoints.playlists(), query: { page_size: 1000 } });
  return data.results.map((playlist) => playlist.slug);
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
