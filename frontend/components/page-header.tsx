import { SiteHeader } from "@/components/site-header";

/**
 * `{% include "partials/header.html" %}`
 *
 * The header queries `/api/search` as you type, so no index is shipped with the
 * page — the fixtures stay on the server.
 */
export function PageHeader() {
  return <SiteHeader />;
}
