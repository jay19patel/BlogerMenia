import { Suspense } from "react";
import UserBlogsList from "@/components/UserBlogsList";
import { api } from "@/lib/api";

async function getProfile(username) {
  try {
    return await api.getUserProfileByEmail(username);
  } catch (error) {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  const profile = await getProfile(username);

  if (!profile) {
    return {
      title: "User Not Found - BlogerMenia",
      description: "The requested user profile was not found.",
    };
  }

  return {
    title: `${profile.full_name || username}'s Blogs - BlogerMenia`,
    description: profile.bio || `Read amazing blogs by ${profile.full_name || username} on BlogerMenia.`,
  };
}

export default async function UserBlogsPage({ params }) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm">Loading...</div>
      </div>
    }>
      <UserBlogsList username={username} />
    </Suspense>
  );
}
