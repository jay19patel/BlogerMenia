import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

/**
 * `/robots.txt`
 *
 * Crawlers are kept out of the BFF and of anything that only makes sense for a
 * signed-in user, so crawl budget goes to the content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/accounts/", "/search/", "/blogs/create/", "/*/update/", "/*/delete/", "/*/edit/", "/*/pdf/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
