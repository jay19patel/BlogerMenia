import type { Blog, Playlist, User } from "@/lib/types";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { urls } from "@/lib/urls";

/**
 * Schema.org structured data.
 *
 * Emitted as `application/ld+json`, which is the format Google documents for
 * rich results. The payload is built from our own typed models and serialised
 * with `JSON.stringify`, so there is no interpolation of raw strings into the
 * script; `<` is escaped to close off the one way a string value could break
 * out of the script element.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Site-level identity plus the search action that enables a sitelinks searchbox. */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/blogs/?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

function personNode(user: User) {
  return {
    "@type": "Person",
    name: user.display_name,
    url: absoluteUrl(urls.userProfile(user.username)),
    ...(user.bio ? { description: user.bio } : {}),
    ...(user.linkedin_url ? { sameAs: [user.linkedin_url] } : {}),
  };
}

export function ArticleJsonLd({ blog }: { blog: Blog }) {
  const url = absoluteUrl(urls.blogDetail(blog.slug));
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: blog.title,
        description: blog.excerpt || blog.subtitle,
        url,
        datePublished: blog.created_at,
        dateModified: blog.updated_at,
        author: personNode(blog.author),
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        ...(blog.image ? { image: [absoluteUrl(blog.image)] } : {}),
        ...(blog.tags.length ? { keywords: blog.tags.join(", ") } : {}),
        ...(blog.category ? { articleSection: blog.category.name } : {}),
        interactionStatistic: [
          {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/ReadAction",
            userInteractionCount: blog.read_count,
          },
          {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/LikeAction",
            userInteractionCount: blog.like_count,
          },
        ],
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  );
}

export function ProfileJsonLd({ user, blogCount }: { user: User; blogCount: number }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: { ...personNode(user), ...(user.about ? { description: user.about } : {}) },
        url: absoluteUrl(urls.userProfile(user.username)),
        interactionStatistic: {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/WriteAction",
          userInteractionCount: blogCount,
        },
      }}
    />
  );
}

export function ItemListJsonLd({ name, items }: { name: string; items: { title: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.title,
          url: absoluteUrl(item.path),
        })),
      }}
    />
  );
}

export function CollectionJsonLd({ playlist }: { playlist: Playlist }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: playlist.title,
        description: playlist.description,
        url: absoluteUrl(urls.playlistDetail(playlist.slug)),
        dateModified: playlist.updated_at,
        author: personNode(playlist.author),
        hasPart: playlist.blogs.map((blog) => ({
          "@type": "BlogPosting",
          headline: blog.title,
          url: absoluteUrl(urls.blogDetail(blog.slug)),
        })),
      }}
    />
  );
}
