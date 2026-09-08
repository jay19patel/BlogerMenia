import "server-only";

import { z } from "zod";

import { request, requestVoid } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { blogSchema, detailSchema, paginated, type BlogPayload } from "@/lib/api/schemas";
import { toBlog } from "@/lib/models";
import type { Blog } from "@/lib/types";

const blogPage = paginated(blogSchema);

/** Matches `REST_FRAMEWORK["PAGE_SIZE"]`. Both sides must agree or the page
 *  count comes out wrong — this used to be 10 against a backend serving 20. */
export const BLOG_PAGE_SIZE = 10;

/** `core.pagination.PageNumberPagination.max_page_size`. Asking for more is
 *  silently capped, so anything that needs every row has to page. */
export const MAX_PAGE_SIZE = 100;

export interface BlogListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  author?: string;
  /** Filter to posts carrying this tag. */
  tag?: string;
  ordering?: "-created_at" | "created_at" | "-read_count";
  featured?: boolean;
  /** Omit one post — used for "More like this". */
  exclude?: string;
  /** Include the viewer's own unpublished drafts. */
  includeDrafts?: boolean;
}

export interface BlogList {
  blogs: Blog[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function listQuery(params: BlogListParams, page: number, pageSize: number) {
  return {
    page,
    page_size: pageSize,
    category: params.category,
    author: params.author,
    tag: params.tag,
    ordering: params.ordering,
    featured: params.featured,
    exclude: params.exclude,
    include_drafts: params.includeDrafts ? "true" : undefined,
  };
}

export async function listBlogs(params: BlogListParams = {}): Promise<BlogList> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(params.pageSize ?? BLOG_PAGE_SIZE, MAX_PAGE_SIZE);

  const data = await request(blogPage, {
    path: endpoints.blogs(),
    query: listQuery(params, page, pageSize),
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

/**
 * Every page of a listing.
 *
 * `page_size` is capped server-side, so the sitemap and `generateStaticParams`
 * cannot just ask for 1000 rows — they used to, and silently covered 20.
 */
export async function listAllBlogs(params: BlogListParams = {}): Promise<Blog[]> {
  const collected: Blog[] = [];
  let page = 1;

  for (;;) {
    const data = await request(blogPage, {
      path: endpoints.blogs(),
      query: listQuery(params, page, MAX_PAGE_SIZE),
      next: { tags: ["blogs"] },
    });
    collected.push(...data.results.map(toBlog));
    if (!data.next) break;
    page += 1;
  }

  return collected;
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

/** Every published slug — for `generateStaticParams` and the sitemap. */
export async function listAllBlogSlugs(): Promise<string[]> {
  return (await listAllBlogs()).map((blog) => blog.slug);
}

/** "More like this": recent posts other than the one being read. */
export async function listRelatedBlogs(slug: string, category?: string): Promise<Blog[]> {
  // Prefer same-category posts; fall back to recent ones so the rail is never
  // empty on an uncategorised post.
  if (category) {
    const { blogs } = await listBlogs({ exclude: slug, category, pageSize: 4 });
    if (blogs.length > 0) return blogs;
  }
  const { blogs } = await listBlogs({ exclude: slug, pageSize: 4 });
  return blogs;
}

const likeResultSchema = z.object({ liked: z.boolean(), like_count: z.number().int() });
const saveResultSchema = z.object({ saved: z.boolean() });

export async function likeBlog(slug: string, token: string | null) {
  return request(likeResultSchema, { path: endpoints.blogLike(slug), method: "POST", token });
}

export async function saveBlog(slug: string, token: string | null) {
  return request(saveResultSchema, { path: endpoints.blogSave(slug), method: "POST", token });
}

/** Queues a real share; the post URL lands on the blog when the task finishes. */
export async function shareBlogToLinkedIn(slug: string, token: string | null) {
  return request(detailSchema, {
    path: endpoints.blogShareLinkedIn(slug),
    method: "POST",
    token,
  });
}

export async function createBlog(payload: BlogPayload | FormData, token: string | null) {
  return request(blogSchema, { path: endpoints.blogs(), method: "POST", body: payload, token });
}

export async function updateBlog(slug: string, payload: BlogPayload | FormData, token: string | null) {
  return request(blogSchema, { path: endpoints.blog(slug), method: "PATCH", body: payload, token });
}

export async function deleteBlog(slug: string, token: string | null) {
  return requestVoid({ path: endpoints.blog(slug), method: "DELETE", token });
}
