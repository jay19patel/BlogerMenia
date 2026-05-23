"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import BlogEditor from "@/components/BlogEditor";

export default function EditBlogPage() {
  const { id } = useParams();
  const { user, token, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [initialData, setInitialData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Authentication check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Fetch blog data
  useEffect(() => {
    const fetchBlogData = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        // api.getBlogBySlug can handle missing token if cookies are used automatically
        const data = await api.getBlogBySlug(id);
        setInitialData(data);
      } catch (err) {
        console.error("Error fetching blog:", err);
        toast.error("Failed to load blog data");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchBlogData();
  }, [id]);

  const handleSave = async (blogData) => {
    try {
      const response = await api.updateBlog(id, blogData, token);
      toast.success(`Blog "${blogData.title}" successfully updated!`, {
        description: "Your changes have been saved.",
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
      isEditMode={true}
      initialData={initialData}
      isLoadingData={isLoadingData}
      onSave={handleSave}
    />
  );
}
