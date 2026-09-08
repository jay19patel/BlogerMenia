import { z } from "zod";

/**
 * The wire contract.
 *
 * Every field here is what a Django REST Framework serializer returns, in DRF's
 * own conventions: `snake_case` keys, ISO-8601 datetimes, `{count, next,
 * previous, results}` for paginated lists. Responses are parsed through these
 * schemas at the transport boundary, so a serializer that drifts from the
 * contract fails loudly at the edge instead of rendering `undefined` three
 * components deep.
 *
 * These schemas are hand-maintained, which is how they drifted from the
 * serializers in the first place. The backend now publishes an OpenAPI document
 * at `/api/schema/` (Swagger UI at `/api/docs/`) — check against it when
 * changing anything here.
 */

/* ---------------------------------------------------------------- primitives */

/** DRF paginates with `PageNumberPagination`. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    count: z.number().int().nonnegative(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(item),
  });
}

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export const categoryColorSchema = z.enum(["blue", "rose", "amber", "purple", "teal", "indigo"]);

/* ------------------------------------------------------------------ category */

export const categorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  color: categoryColorSchema,
  /** Published posts in this category. */
  blog_count: z.number().int().nonnegative(),
});

/* ---------------------------------------------------------------------- user */

/**
 * `accounts.serializers.AuthorSerializer` — the author of a post or playlist.
 *
 * Deliberately narrow. This is embedded in every row of every listing, and the
 * wide serializer it replaced cost four extra queries per author and leaked
 * the author's email address into public responses.
 */
export const authorSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  bio: z.string(),
  profile_picture: z.string().nullable(),
  linkedin_url: z.string(),
  avatar_svg: z.string(),
  /** `CustomUser.has_linkedin_oauth()` */
  has_linkedin_oauth: z.boolean(),
});

/** `PublicUserSerializer` — a member as anyone may see them. */
export const userSchema = authorSchema.extend({
  about: z.string(),
  linkedin_connected: z.boolean(),
  date_joined: z.iso.datetime(),
  blog_count: z.number().int().nonnegative(),
  playlist_count: z.number().int().nonnegative(),
});

/**
 * `CurrentUserSerializer` — your own record.
 *
 * The private fields live only here: `GET /users/` used to carry `email`,
 * `saved_blog_ids` and `liked_blog_ids` for every member on the site.
 */
export const currentUserSchema = userSchema.extend({
  email: z.email().or(z.literal("")),
  auto_post_to_linkedin: z.boolean(),
  saved_blog_ids: z.array(z.number().int()),
  liked_blog_ids: z.array(z.number().int()),
});

/* ------------------------------------------------------------------ sections */

export const sectionTypeSchema = z.enum([
  "text", "note", "code", "bullets", "table",
  "youtube", "links", "image", "flowchart", "excalidraw",
]);

export const sectionLinkSchema = z.object({
  text: z.string().optional(),
  url: z.string(),
  description: z.string().optional(),
});

export const flowchartStepSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  branches: z.array(z.object({ title: z.string(), description: z.string().optional() })).optional(),
});

/** One block of `Blog.sections` (a `JSONField`, so every key is optional). */
export const blogSectionSchema = z.object({
  type: sectionTypeSchema,
  title: z.string().optional(),
  content: z.string().optional(),
  language: z.string().optional(),
  items: z.array(z.string()).optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
  videoId: z.string().optional(),
  videoTitle: z.string().optional(),
  description: z.string().optional(),
  links: z.array(sectionLinkSchema).optional(),
  imageUrl: z.string().optional(),
  attachment: z.string().optional(),
  steps: z.array(flowchartStepSchema).optional(),
  svgData: z.string().optional(),
  caption: z.string().optional(),
});

/* ------------------------------------------------------------- playlist / blog */

/** A playlist without its posts expanded, as embedded on a blog. */
export const playlistSummarySchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  image: z.string().nullable(),
  slug: z.string(),
  author: authorSchema,
  avatar_svg: z.string(),
  blog_count: z.number().int().nonnegative(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

/** Whether the post made it into the search index. Surfaced to its author. */
export const embeddingStatusSchema = z.enum(["pending", "indexed", "failed", "skipped"]);

export const blogSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string(),
  excerpt: z.string(),
  /** Legacy single-body HTML; blank on structured posts. Sanitised server-side. */
  content: z.string(),
  introduction: z.string(),
  conclusion: z.string(),
  sections: z.array(blogSectionSchema),
  tags: z.array(z.string()),
  image: z.string().nullable(),
  avatar_svg: z.string(),
  author: authorSchema,
  category: categorySchema.nullable(),
  playlists: z.array(playlistSummarySchema),
  is_published: z.boolean(),
  featured: z.boolean(),
  /** Owned by the LinkedIn task, never writable by a client. */
  posted_on_linkedin: z.boolean(),
  linkedin_post_url: z.string().nullable(),
  read_count: z.number().int().nonnegative(),
  like_count: z.number().int().nonnegative(),
  is_liked: z.boolean().optional(),
  embedding_status: embeddingStatusSchema.optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const playlistSchema = playlistSummarySchema.extend({
  blogs: z.array(blogSchema),
});

/* -------------------------------------------------------------------- search */

export const searchResultSchema = z.object({
  kind: z.enum(["blog", "playlist", "profile"]),
  label: z.string(),
  title: z.string(),
  subtitle: z.string(),
  url: z.string(),
  image_url: z.string().nullable(),
  /**
   * A generated placeholder avatar, or `null` when the object has a real
   * image — which is why this is nullable. It was not, so a single result with
   * a cover image failed validation and broke the whole search response.
   */
  icon_html: z.string().nullable(),
  posted_on_linkedin: z.boolean().optional(),
  linkedin_post_url: z.string().nullable().optional(),
  score: z.number().optional(),
});

export const searchResponseSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
});

/* ---------------------------------------------------------------------- auth */

/** `rest_framework_simplejwt.views.TokenObtainPairView` */
export const tokenPairSchema = z.object({
  access: z.string(),
  refresh: z.string(),
});

/** `TokenRefreshView` — also returns `refresh` when ROTATE_REFRESH_TOKENS is on. */
export const tokenRefreshSchema = z.object({
  access: z.string(),
  refresh: z.string().optional(),
});

/** Endpoints that answer with a message rather than a resource. */
export const detailSchema = z.object({ detail: z.string() });

/* ------------------------------------------------------------------- payloads */

export const loginPayloadSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "This field may not be blank."),
});

export const signupPayloadSchema = z
  .object({
    email: z.email("Enter a valid email address."),
    // Mirrors AUTH_PASSWORD_VALIDATORS, which the API now actually runs. The
    // server remains the authority; this is only a faster first answer.
    password1: z.string().min(8, "This password is too short. It must contain at least 8 characters."),
    password2: z.string(),
  })
  .refine((data) => data.password1 === data.password2, {
    message: "You must type the same password each time.",
    path: ["password2"],
  });

export const contactPayloadSchema = z.object({
  name: z.string().min(1, "This field is required.").max(100),
  email: z.email("Enter a valid email address."),
  subject: z.string().min(1, "This field is required.").max(200),
  message: z.string().min(1, "This field is required."),
});

export const profilePayloadSchema = z.object({
  first_name: z.string().max(150),
  last_name: z.string().max(150),
  bio: z.string().max(500),
  about: z.string(),
  linkedin_url: z.union([z.url("Enter a valid URL."), z.literal("")]),
  auto_post_to_linkedin: z.boolean(),
});

export const playlistPayloadSchema = z.object({
  title: z.string().min(1, "This field is required.").max(200),
  description: z.string(),
  /** `PlaylistSerializer.blog_ids` */
  blog_ids: z.array(z.number().int()),
});

export const blogPayloadSchema = z.object({
  title: z.string().min(1, "Title is required."),
  subtitle: z.string(),
  excerpt: z.string(),
  /** Free text; the backend resolves or creates the category. */
  category_name: z.string(),
  tags: z.array(z.string()),
  introduction: z.string(),
  conclusion: z.string(),
  sections: z.array(blogSectionSchema),
  is_published: z.boolean(),
  featured: z.boolean(),
  /**
   * An intent, not stored state: "share this once it saves". The stored
   * `posted_on_linkedin` flag is read-only and owned by the task that does it.
   */
  post_to_linkedin: z.boolean(),
  playlist_ids: z.array(z.number().int()),
  /**
   * The `updated_at` the editor loaded. The backend answers 409 if the post has
   * moved on since, rather than silently discarding the other author's edit.
   */
  expected_updated_at: z.string().optional(),
});

/* --------------------------------------------------------------------- types */

export type Category = z.infer<typeof categorySchema>;
export type ApiAuthor = z.infer<typeof authorSchema>;
export type ApiUser = z.infer<typeof userSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;
export type BlogSection = z.infer<typeof blogSectionSchema>;
export type SectionType = z.infer<typeof sectionTypeSchema>;
export type SectionLink = z.infer<typeof sectionLinkSchema>;
export type FlowchartStep = z.infer<typeof flowchartStepSchema>;
export type EmbeddingStatus = z.infer<typeof embeddingStatusSchema>;
export type ApiBlog = z.infer<typeof blogSchema>;
export type PlaylistSummary = z.infer<typeof playlistSummarySchema>;
export type ApiPlaylist = z.infer<typeof playlistSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type SignupPayload = z.infer<typeof signupPayloadSchema>;
export type ContactPayload = z.infer<typeof contactPayloadSchema>;
export type ProfilePayload = z.infer<typeof profilePayloadSchema>;
export type PlaylistPayload = z.infer<typeof playlistPayloadSchema>;
export type BlogPayload = z.infer<typeof blogPayloadSchema>;
