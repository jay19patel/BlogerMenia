import type { MetadataRoute } from "next";

import { blogs as blogsApi, playlists as playlistsApi, users as usersApi } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";
import { urls } from "@/lib/urls";

/**
 * `/sitemap.xml`
 *
 * Only public, indexable pages: published posts, playlists, author profiles and
 * the listing pages. Editors, delete confirmations and the account flows are
 * excluded — they are behind auth and carry no crawlable value.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogPage, playlistPage, authors] = await Promise.all([
    blogsApi.listBlogs({ pageSize: 1000 }),
    playlistsApi.listPlaylists({ pageSize: 1000 }),
    usersApi.listUsers(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl(urls.home()), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl(urls.blogList()), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl(urls.playlistList()), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl(urls.userList()), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl(urls.contact()), changeFrequency: "yearly", priority: 0.3 },
  ];

  return [
    ...staticRoutes,
    ...blogPage.blogs.map((blog) => ({
      url: absoluteUrl(urls.blogDetail(blog.slug)),
      lastModified: new Date(blog.updated_at),
      changeFrequency: "monthly" as const,
      priority: blog.featured ? 0.9 : 0.8,
    })),
    ...playlistPage.playlists.map((playlist) => ({
      url: absoluteUrl(urls.playlistDetail(playlist.slug)),
      lastModified: new Date(playlist.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...authors.map((author) => ({
      url: absoluteUrl(urls.userProfile(author.username)),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
