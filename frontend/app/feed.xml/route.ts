import { blogs as blogsApi } from "@/lib/api";
import { blogSummary, readingMinutes } from "@/lib/blog";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { urls } from "@/lib/urls";

/**
 * `/feed.xml` — an RSS 2.0 feed of the published posts.
 *
 * A blog is expected to be subscribable, and the site had no feed at all. Built
 * from the same data layer as the sitemap, so it cannot list a post the site
 * does not serve.
 */

/** RSS is XML: five characters must be escaped or a stray `&` breaks the feed. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const { blogs } = await blogsApi.listBlogs({ pageSize: 50 });

  const items = blogs
    .map((blog) => {
      const url = absoluteUrl(urls.blogDetail(blog.slug));
      return `    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(blog.created_at).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(blog.author.display_name)}</dc:creator>
      <description>${escapeXml(blogSummary(blog, 40))}</description>
${blog.category ? `      <category>${escapeXml(blog.category.name)}</category>\n` : ""}${blog.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join("\n")}${blog.tags.length ? "\n" : ""}      <content:encoded><![CDATA[${blogSummary(blog, 60)} (${readingMinutes(blog)} min read)]]></content:encoded>
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl("/feed.xml"))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
