import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import UserBlogsList from "@/components/UserBlogsList";
import { api } from "@/lib/api";

const BLOGS_PER_PAGE = 9;

async function getProfile(username) {
  try {
    return await api.getUserProfileByUsername(username);
  } catch (error) {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return {
      title: "User Not Found - BlogerMenia",
      description: "The requested user profile was not found.",
    };
  }

  return {
    title: `${profile.full_name || profile.username}'s Blogs - BlogerMenia`,
    description: profile.bio || `Read amazing blogs by ${profile.username} on BlogerMenia.`,
  };
}

export default async function UserBlogsPage({ params }) {
  const { username } = await params;
  const queryClient = new QueryClient();

  // 1. Prefetch User Profile
  await queryClient.prefetchQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      const profile = await api.getUserProfileByUsername(username);
      if (!profile) throw new Error("User not found");
      return profile;
    },
  });

  // 2. Prefetch Categories
  await queryClient.prefetchQuery({
    queryKey: ["blogCategories", username],
    queryFn: () => api.getBlogCategories(username),
  });

  // 3. Prefetch Playlists
  await queryClient.prefetchQuery({
    queryKey: ["userPlaylists", username],
    queryFn: () => api.getUserPlaylistsByUsername(username),
  });

  // 4. Prefetch Blogs (Page 1)
  await queryClient.prefetchQuery({
    queryKey: [
      "userBlogs",
      username,
      {
        search: null,
        category: null,
        page: 1,
      },
    ],
    queryFn: () => api.getBlogs(null, 0, BLOGS_PER_PAGE, null, username),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserBlogsList username={username} />
    </HydrationBoundary>
  );
}
