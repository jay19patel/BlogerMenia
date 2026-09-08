import "server-only";

/**
 * The data layer's public surface.
 *
 * Server Components and route handlers import from here; only
 * `lib/api/client.ts` below it knows how to reach Django.
 */
export * as blogs from "@/lib/api/resources/blogs";
export * as playlists from "@/lib/api/resources/playlists";
export * as users from "@/lib/api/resources/users";
export * as auth from "@/lib/api/resources/auth";
export * as misc from "@/lib/api/resources/misc";

export { ApiError } from "@/lib/api/errors";
