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
        <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm flex items-center gap-3">
          <span className="size-4 border-2 border-border border-t-primary rounded-full animate-spin" />
          Loading...
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
