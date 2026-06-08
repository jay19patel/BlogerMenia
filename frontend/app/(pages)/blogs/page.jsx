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
        <div className="border-2 border-foreground p-8 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
          <p className="font-mono font-bold text-xs uppercase tracking-widest text-foreground">Loading Logs...</p>
        </div>
      </div>
    }>
      <BlogsList />
    </Suspense>
  );
}
