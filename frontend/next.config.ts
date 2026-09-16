import type { NextConfig } from "next";

/**
 * Where Django is reachable. Read from the environment rather than hardcoded:
 * the rewrite below pointed at `127.0.0.1:8000`, which works locally and
 * silently breaks every social login in production.
 */
const djangoOrigin = (() => {
  const raw = process.env.DJANGO_ORIGIN || process.env.API_BASE_URL || (process.env.NODE_ENV === "production" ? "https://blogermenia.onrender.com" : "http://localhost:8000");
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "https://blogermenia.onrender.com";
  }
})();

const nextConfig: NextConfig = {
  /**
   * Django's `APPEND_SLASH` means every canonical URL ends in `/`. Keeping the
   * same convention here means links and bookmarks carry over unchanged.
   */
  trailingSlash: true,

  async rewrites() {
    return [
      // allauth's own view tree. The LinkedIn OAuth redirect dance has to
      // happen against Django, so those URLs are proxied rather than
      // reimplemented.
      //
      // The trailing slashes here are load-bearing, and both ends need them:
      // with `trailingSlash: true` the source must end in `/` to match, and
      // `:path*` captures the segments without it. A destination of
      // `/accounts/:path*` therefore asks Django for the unslashed URL, whose
      // APPEND_SLASH answers 301 back to the slashed one — which the browser
      // requests again through this same rewrite, looping until it gives up.
      {
        source: "/accounts/",
        destination: `${djangoOrigin}/accounts/`,
      },
      {
        source: "/accounts/:path*/",
        destination: `${djangoOrigin}/accounts/:path*/`,
      },
    ];
  },
};

export default nextConfig;
