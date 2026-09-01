import type { Metadata } from "next";

/**
 * Shared SEO configuration.
 *
 * `NEXT_PUBLIC_SITE_URL` must be the deployed origin — canonical URLs, Open
 * Graph images, the sitemap and robots.txt are all derived from it.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "BlogerMenia";

export const SITE_DESCRIPTION =
  "BlogerMenia is where engineers, creators, and curious minds publish thoughtful " +
  "perspectives on technology, design, and software architecture.";

/** Absolute URL for a site-relative path — required by Open Graph and canonicals. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageSeoOptions {
  title: string;
  description?: string;
  path: string;
  /** Overrides the generated OG image. */
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  /** Keep drafts and thin pages out of the index. */
  noIndex?: boolean;
}

/** Build a page's `metadata`, including canonical, Open Graph and Twitter tags. */
export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  tags,
  noIndex = false,
}: PageSeoOptions): Metadata {
  const url = absoluteUrl(path);
  const images = image ? [{ url: absoluteUrl(image) }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: SITE_NAME,
      images,
      ...(type === "article" ? { publishedTime, modifiedTime, authors, tags } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((entry) => entry.url),
    },
  };
}
