import { Suspense } from "react";
import BlogsList from "@/components/BlogsList";

export const metadata = {
  title: "Explore Blogs - BlogerMenia",
  description: "Discover stories, thinking, and expertise from writers on any topic.",
};

export default function BlogsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>}>
      <BlogsList />
    </Suspense>
  );
}
