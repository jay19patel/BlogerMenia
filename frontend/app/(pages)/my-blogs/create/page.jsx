"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import BlogEditor from "@/components/BlogEditor";
import { useEffect } from "react";

export default function CreateBlogPage() {
  const { user, token, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [isAuthenticated, loading, router]);

  const handleSave = async (blogData) => {
    try {
      const response = await api.createBlog(blogData, token);
      toast.success(`Blog "${blogData.title}" successfully created!`, {
        description: "Your new blog has been published.",
        duration: 4000,
      });
      setTimeout(() => {
        router.push("/my-blogs");
      }, 1000);
      return response;
    } catch (error) {
      // Bubble up the error to let the BlogEditor show the toast
      throw error;
    }
  };

  if (loading || (isAuthenticated && !user) || !isAuthenticated) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex items-center justify-center gap-3 bg-background px-6 py-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
          <span className="h-5 w-5 border-2 border-foreground border-r-transparent animate-spin"></span>
          <span className="font-mono font-bold text-sm uppercase tracking-widest text-foreground">Loading System...</span>
        </div>
      </div>
    );
  }

  return (
    <BlogEditor
      isEditMode={false}
      onSave={handleSave}
    />
  );
}
