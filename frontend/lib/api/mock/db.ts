import "server-only";

import blogRecords from "@/data/blogs.json";
import categoryRecords from "@/data/categories.json";
import playlistRecords from "@/data/playlists.json";
import userRecords from "@/data/users.json";

import { generateAvatar } from "@/lib/avatar";
import type {
  ApiBlog,
  ApiPlaylist,
  ApiUser,
  BlogSection,
  Category,
  PlaylistSummary,
} from "@/lib/api/schemas";

/**
 * The in-memory stand-in for the Django ORM.
 *
 * Fixtures are joined once at module load into exactly the shapes
 * `lib/api/schemas.ts` describes, so the mock and a real DRF backend are
 * indistinguishable to everything above the transport. Delete this directory
 * when you switch `API_MODE` to `live`.
 */

interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  color: Category["color"];
}

interface UserRecord {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  about: string;
  profile_picture: string | null;
  linkedin_url: string;
  linkedin_connected: boolean;
  auto_post_to_linkedin: boolean;
  has_linkedin_oauth: boolean;
  date_joined: string;
  saved_blog_ids: number[];
}

interface BlogRecord {
  id: number;
  title: string;
  content: string;
  image: string | null;
  author_id: number;
  category_slug: string | null;
  slug: string;
  is_published: boolean;
  posted_on_linkedin: boolean;
  linkedin_post_url: string | null;
  read_count: number;
  subtitle: string;
  excerpt: string;
  introduction: string;
  conclusion: string;
  tags: string[];
  featured: boolean;
  sections: BlogSection[];
  created_at: string;
  updated_at: string;
  like_count: number;
}

interface PlaylistRecord {
  id: number;
  title: string;
  description: string;
  image: string | null;
  author_id: number;
  slug: string;
  blog_ids: number[];
  created_at: string;
  updated_at: string;
}

const rawCategories = categoryRecords as CategoryRecord[];
const rawUsers = userRecords as UserRecord[];
const rawBlogs = blogRecords as BlogRecord[];
const rawPlaylists = playlistRecords as PlaylistRecord[];

const newestFirst = <T extends { created_at: string }>(a: T, b: T) =>
  Date.parse(b.created_at) - Date.parse(a.created_at);

/** `Category.Meta.ordering = ['name']` */
export const categories: Category[] = [...rawCategories]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((record) => ({
    ...record,
    blog_count: rawBlogs.filter((blog) => blog.category_slug === record.slug).length,
  }));

const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

export const users: ApiUser[] = rawUsers.map((record) => ({
  id: record.id,
  username: record.username,
  first_name: record.first_name,
  last_name: record.last_name,
  email: record.email,
  bio: record.bio,
  about: record.about,
  profile_picture: record.profile_picture,
  linkedin_url: record.linkedin_url,
  linkedin_connected: record.linkedin_connected,
  auto_post_to_linkedin: record.auto_post_to_linkedin,
  has_linkedin_oauth: record.has_linkedin_oauth,
  date_joined: record.date_joined,
  avatar_svg: generateAvatar(record.username, "big-smile"),
  blog_count: rawBlogs.filter((blog) => blog.author_id === record.id && blog.is_published).length,
  playlist_count: rawPlaylists.filter((playlist) => playlist.author_id === record.id).length,
}));

const userById = new Map(users.map((user) => [user.id, user]));

/** The fixture bookmark sets, exposed through `GET /users/me/`. */
export const savedBlogIdsByUser = new Map(rawUsers.map((user) => [user.id, [...user.saved_blog_ids]]));

function requireUser(id: number): ApiUser {
  const user = userById.get(id);
  if (!user) throw new Error(`Fixture error: no user with id ${id}`);
  return user;
}

export const playlistSummaries: PlaylistSummary[] = [...rawPlaylists].sort(newestFirst).map((record) => ({
  id: record.id,
  title: record.title,
  description: record.description,
  image: record.image,
  slug: record.slug,
  author: requireUser(record.author_id),
  avatar_svg: generateAvatar(record.slug, "shapes"),
  blog_count: record.blog_ids.length,
  created_at: record.created_at,
  updated_at: record.updated_at,
}));

const summaryById = new Map(playlistSummaries.map((playlist) => [playlist.id, playlist]));

/** `Blog.Meta.ordering = ['-created_at']` */
export const blogs: ApiBlog[] = [...rawBlogs].sort(newestFirst).map((record) => ({
  id: record.id,
  title: record.title,
  slug: record.slug,
  subtitle: record.subtitle,
  excerpt: record.excerpt,
  content: record.content,
  introduction: record.introduction,
  conclusion: record.conclusion,
  sections: record.sections,
  tags: record.tags,
  image: record.image,
  avatar_svg: generateAvatar(record.slug, "shapes"),
  author: requireUser(record.author_id),
  category: record.category_slug ? (categoryBySlug.get(record.category_slug) ?? null) : null,
  playlists: rawPlaylists
    .filter((playlist) => playlist.blog_ids.includes(record.id))
    .map((playlist) => summaryById.get(playlist.id))
    .filter((playlist): playlist is PlaylistSummary => Boolean(playlist)),
  is_published: record.is_published,
  featured: record.featured,
  posted_on_linkedin: record.posted_on_linkedin,
  linkedin_post_url: record.linkedin_post_url,
  read_count: record.read_count,
  like_count: record.like_count,
  created_at: record.created_at,
  updated_at: record.updated_at,
}));

const blogById = new Map(blogs.map((blog) => [blog.id, blog]));

export const playlists: ApiPlaylist[] = [...rawPlaylists].sort(newestFirst).map((record) => ({
  ...(summaryById.get(record.id) as PlaylistSummary),
  // Membership keeps the order the author arranged, not creation order.
  blogs: record.blog_ids.map((id) => blogById.get(id)).filter((blog): blog is ApiBlog => Boolean(blog)),
}));

export const publishedBlogs = blogs.filter((blog) => blog.is_published);

export function findBlog(slug: string) {
  return blogs.find((blog) => blog.slug === slug) ?? null;
}

export function findBlogById(id: number) {
  return blogById.get(id) ?? null;
}

export function findPlaylist(slug: string) {
  return playlists.find((playlist) => playlist.slug === slug) ?? null;
}

export function findUser(username: string) {
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export function findUserByEmail(email: string) {
  const normalised = email.trim().toLowerCase();
  return (
    users.find((user) => user.email.toLowerCase() === normalised) ??
    users.find((user) => user.username.toLowerCase() === normalised.split("@")[0]) ??
    null
  );
}
