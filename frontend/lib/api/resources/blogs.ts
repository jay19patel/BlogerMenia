import "server-only";

import { z } from "zod";

import { request, requestVoid } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { blogSchema, paginated, type BlogPayload } from "@/lib/api/schemas";
import { toBlog } from "@/lib/models";
import type { Blog } from "@/lib/types";

const blogPage = paginated(blogSchema);

/** How many posts a listing page shows — mirrors `BlogListView.paginate_by`. */
export const BLOG_PAGE_SIZE = 10;

export interface BlogListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  author?: string;
  ordering?: "-created_at" | "-read_count";
  featured?: boolean;
  /** Omit one post — used for "More like this". */
  exclude?: string;
}

export interface BlogList {
  blogs: Blog[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listBlogs(params: BlogListParams = {}): Promise<BlogList> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? BLOG_PAGE_SIZE;

  const data = await request(blogPage, {
    path: endpoints.blogs(),
    query: {
      page,
      page_size: pageSize,
      category: params.category,
      author: params.author,
      ordering: params.ordering,
      featured: params.featured,
      exclude: params.exclude,
    },
    next: { tags: ["blogs"] },
  });

  return {
    blogs: data.results.map(toBlog),
    count: data.count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(data.count / pageSize)),
  };
}

/** `null` rather than a throw, so pages can call `notFound()` themselves. */
export async function getBlog(slug: string): Promise<Blog | null> {
  try {
    return toBlog(await request(blogSchema, { path: endpoints.blog(slug), next: { tags: [`blog:${slug}`] } }));
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/** Every slug, drafts included — for `generateStaticParams`. */
export async function listAllBlogSlugs(): Promise<string[]> {
  const data = await request(blogPage, { path: endpoints.blogs(), query: { page_size: 1000 } });
  return data.results.map((blog) => blog.slug);
}

/** `BlogDetailView.get_context_data['related_blogs']` */
export async function listRelatedBlogs(slug: string): Promise<Blog[]> {
  const { blogs } = await listBlogs({ exclude: slug, pageSize: 4 });
  return blogs;
}

const likeResultSchema = z.object({ liked: z.boolean(), like_count: z.number().int() });

export async function likeBlog(slug: string, token: string | null) {
  return request(likeResultSchema, { path: endpoints.blogLike(slug), method: "POST", token });
}

export async function saveBlog(slug: string, token: string | null) {
  return requestVoid({ path: endpoints.blogSave(slug), method: "POST", token });
}

export async function shareBlogToLinkedIn(slug: string, token: string | null) {
  return requestVoid({ path: endpoints.blogShareLinkedIn(slug), method: "POST", token });
}

export async function createBlog(payload: BlogPayload, token: string | null) {
  return request(blogSchema, { path: endpoints.blogs(), method: "POST", body: payload, token });
}

export async function updateBlog(slug: string, payload: BlogPayload, token: string | null) {
  return request(blogSchema, { path: endpoints.blog(slug), method: "PATCH", body: payload, token });
}

export async function deleteBlog(slug: string, token: string | null) {
  return requestVoid({ path: endpoints.blog(slug), method: "DELETE", token });
}
