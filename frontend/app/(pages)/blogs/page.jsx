import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import BlogsList from "@/components/BlogsList";
import { api } from "@/lib/api";

export const metadata = {
  title: "Explore Blogs - BlogerMenia",
  description:
    "Discover stories, thinking, and expertise from writers on any topic.",
};

export default async function BlogsPage() {
  const queryClient = new QueryClient();

  // Prefetch categories
  await queryClient.prefetchQuery({
    queryKey: ["blogCategories"],
    queryFn: () => api.getBlogCategories(),
  });

  // Prefetch initial blogs (Page 1, no search, no filter)
  await queryClient.prefetchQuery({
    queryKey: [
      "blogs",
      {
        search: null,
        category: null,
        page: 1,
      },
    ],
    queryFn: () => api.getBlogs(null, 0, 9, null),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BlogsList />
    </HydrationBoundary>
  );
}
