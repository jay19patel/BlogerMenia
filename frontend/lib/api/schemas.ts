import { z } from "zod";

/**
 * The wire contract.
 *
 * Every field here is what a Django REST Framework serializer is expected to
 * return, in DRF's own conventions: `snake_case` keys, ISO-8601 datetimes,
 * `{count, next, previous, results}` for paginated lists. Responses are parsed
 * through these schemas at the transport boundary, so a serializer that drifts
 * from the contract fails loudly at the edge instead of rendering `undefined`
 * three components deep.
 *
 * The mock transport is validated by exactly the same schemas, which is what
 * makes the swap to a live backend safe.
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
  /** `Category.blogs.count()` — every related post, drafts included. */
  blog_count: z.number().int().nonnegative(),
});

/* ---------------------------------------------------------------------- user */

export const userSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.email().or(z.literal("")),
  bio: z.string(),
  about: z.string(),
  profile_picture: z.string().nullable(),
  linkedin_url: z.string(),
  linkedin_connected: z.boolean(),
  auto_post_to_linkedin: z.boolean(),
  /** `CustomUser.has_linkedin_oauth()` */
  has_linkedin_oauth: z.boolean(),
  date_joined: z.iso.datetime(),
  /** `CustomUser.avatar_svg` — the DiceBear SVG the model already generates. */
  avatar_svg: z.string(),
  /** `annotate(Count('blogs', filter=Q(blogs__is_published=True)))` */
  blog_count: z.number().int().nonnegative(),
  /** `annotate(Count('playlists'))` */
  playlist_count: z.number().int().nonnegative(),
});

/** `GET /users/me/` also exposes the viewer's own like/bookmark sets. */
export const currentUserSchema = userSchema.extend({
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
  author: userSchema,
  avatar_svg: z.string(),
  blog_count: z.number().int().nonnegative(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const blogSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string(),
  excerpt: z.string(),
  /** Legacy single-body HTML; blank on structured posts. */
  content: z.string(),
  introduction: z.string(),
  conclusion: z.string(),
  sections: z.array(blogSectionSchema),
  tags: z.array(z.string()),
  image: z.string().nullable(),
  avatar_svg: z.string(),
  author: userSchema,
  category: categorySchema.nullable(),
  playlists: z.array(playlistSummarySchema),
  is_published: z.boolean(),
  featured: z.boolean(),
  posted_on_linkedin: z.boolean(),
  linkedin_post_url: z.string().nullable(),
  read_count: z.number().int().nonnegative(),
  like_count: z.number().int().nonnegative(),
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
  icon_html: z.string(),
  posted_on_linkedin: z.boolean().optional(),
  linkedin_post_url: z.string().nullable().optional(),
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

/* ------------------------------------------------------------------- payloads */

export const loginPayloadSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "This field may not be blank."),
});

export const signupPayloadSchema = z
  .object({
    email: z.email("Enter a valid email address."),
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
  blogs: z.array(z.number().int()),
});

export const blogPayloadSchema = z.object({
  title: z.string().min(1, "Title is required."),
  slug: z.string(),
  subtitle: z.string(),
  excerpt: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  introduction: z.string(),
  conclusion: z.string(),
  sections: z.array(blogSectionSchema),
  is_published: z.boolean(),
  featured: z.boolean(),
  post_to_linkedin: z.boolean(),
  playlists: z.array(z.number().int()),
});

/* --------------------------------------------------------------------- types */

export type Category = z.infer<typeof categorySchema>;
export type ApiUser = z.infer<typeof userSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;
export type BlogSection = z.infer<typeof blogSectionSchema>;
export type SectionType = z.infer<typeof sectionTypeSchema>;
export type SectionLink = z.infer<typeof sectionLinkSchema>;
export type FlowchartStep = z.infer<typeof flowchartStepSchema>;
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
