import type { NextConfig } from "next";

/**
 * Where Django is reachable. Read from the environment rather than hardcoded:
 * the rewrite below pointed at `127.0.0.1:8000`, which works locally and
 * silently breaks every social login in production.
 */
const djangoOrigin = (
  process.env.DJANGO_ORIGIN ??
  (process.env.API_BASE_URL ? new URL(process.env.API_BASE_URL).origin : "http://127.0.0.1:8000")
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  /**
   * Django's `APPEND_SLASH` means every canonical URL ends in `/`. Keeping the
   * same convention here means links and bookmarks carry over unchanged.
   */
  trailingSlash: true,

  async rewrites() {
    return [
      {
        // allauth's own view tree. The LinkedIn OAuth redirect dance has to
        // happen against Django, so those URLs are proxied rather than
        // reimplemented.
        source: "/accounts/:path*",
        destination: `${djangoOrigin}/accounts/:path*`,
      },
    ];
  },
};

export default nextConfig;
