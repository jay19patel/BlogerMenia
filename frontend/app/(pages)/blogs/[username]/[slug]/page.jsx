import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import BlogDetail from "@/components/BlogDetail";
import { api } from "@/lib/api";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    // Note: getBlogBySlug might fail if API is down or invalid
    // We handle it gracefully
    // Prefetching metadata shouldn't count as a view
    const blog = await api.getBlogBySlug(slug, null, false);
    if (!blog) {
      return {
        title: "Blog Not Found",
      };
    }
    return {
      title: `${blog.title} - BlogerMenia`,
      description: blog.excerpt || blog.subtitle || "Read this amazing blog on BlogerMenia",
      openGraph: {
        title: blog.title,
        description: blog.excerpt || blog.subtitle,
        images: blog.image ? [blog.image] : [],
      },
    };
  } catch (e) {
    return {
      title: "BlogerMenia",
    };
  }
}

export default async function BlogPage({ params }) {
  const { slug, username } = await params;
  const queryClient = new QueryClient();

  // Prefetch the blog data
  await queryClient.prefetchQuery({
    queryKey: ["blog", slug],
    queryKey: ["blog", slug],
    queryFn: async () => {
      // Server-side prefetch shouldn't count as a view
      const blog = await api.getBlogBySlug(slug, null, false);
      if (!blog) throw new Error("Blog not found");
      return blog;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BlogDetail slug={slug} username={username} />
    </HydrationBoundary>
  );
}
