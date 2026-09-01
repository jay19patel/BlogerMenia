import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Django's `APPEND_SLASH` means every canonical URL ends in `/`. Keeping the
   * same convention here means links and bookmarks carry over unchanged.
   */
  trailingSlash: true,
};

export default nextConfig;
