import { Suspense } from "react";
import BlogsList from "@/components/BlogsList";

export const metadata = {
  title: "Explore Blogs - BlogerMenia",
  description: "Discover stories, thinking, and expertise from writers on any topic.",
};

export default function BlogsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm">Loading...</div>
      </div>
    }>
      <BlogsList />
    </Suspense>
  );
}
