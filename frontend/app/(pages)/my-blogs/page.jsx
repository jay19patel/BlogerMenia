"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, Eye, Heart, Star, BookOpen, ListMusic, Edit2, Trash2, Loader2, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, getImageUrl } from "@/lib/utils";
import Image from "next/image";

const BLOGS_PER_PAGE = 10;

export default function MyBlogsPage() {
  const { isAuthenticated, user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [playlistPage, setPlaylistPage] = useState(1);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState(null);
  const [deletingBlogId, setDeletingBlogId] = useState(null);

  const [categories, setCategories] = useState(["All"]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [isFetchingBlogs, setIsFetchingBlogs] = useState(false);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [totalPlaylists, setTotalPlaylists] = useState(0);
  const PLAYLISTS_PER_PAGE = 5;

  // Redirect if definitely not authenticated and not loading
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch User Profile (for stats)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;
      try {
        setProfileLoading(true);
        const profile = await api.getUserProfileByEmail(user.email);
        setUserProfile(profile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user?.email]);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!user?.email) return;
      try {
        const data = await api.getBlogCategories(user.email);
        setCategories(["All", ...(data.categories || [])]);
      } catch (e) {
        console.error("Failed to fetch categories", e);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, [user?.email]);

  // Fetch Playlists
  const fetchPlaylists = async () => {
    if (!user) return;
    try {
      setPlaylistsLoading(true);
      const userId = user.id || user._id;
      const skip = (playlistPage - 1) * PLAYLISTS_PER_PAGE;
      const data = await api.getUserPlaylistsByEmail(user.email, userId, null, true, skip, PLAYLISTS_PER_PAGE);
      setPlaylists(data?.playlists || []);
      setTotalPlaylists(data?.total || 0);
    } catch (e) {
      console.error("Failed to fetch playlists", e);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [user?.email, playlistPage]);

  const playlistTotalPages = Math.ceil(totalPlaylists / PLAYLISTS_PER_PAGE);

  // Fetch Blogs
  const fetchBlogs = async () => {
    if (!user) return;
    setIsFetchingBlogs(true);
    if (blogs.length === 0) setBlogsLoading(true);
    try {
      const skip = (currentPage - 1) * BLOGS_PER_PAGE;
      const search =
        submittedSearch && submittedSearch.trim().length > 0
          ? submittedSearch.trim()
          : null;
      const filter = selectedCategory === "All" ? null : selectedCategory;
      const userId = user.id || user._id;
      const data = await api.getMyBlogs(token, userId, search, skip, BLOGS_PER_PAGE, filter);
      setBlogs(data?.blogs || []);
      setTotalBlogs(data?.total || 0);
    } catch (e) {
      console.error("Failed to fetch blogs", e);
    } finally {
      setBlogsLoading(false);
      setIsFetchingBlogs(false);
    }
  };

  useEffect(() => {
    if (user) fetchBlogs();
  }, [user?.email, submittedSearch, selectedCategory, currentPage]);

  const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

  // Handlers
  const handleToggleFeatured = async (blogId, currentFeatured) => {
    try {
      // Optimistic Update
      const newFeaturedStatus = !currentFeatured;
      setBlogs(prev => prev.map(b => b.id === blogId ? { ...b, featured: newFeaturedStatus } : b));

      await api.toggleFeaturedBlog(token, blogId, newFeaturedStatus);
      toast.success(
        currentFeatured
          ? "Blog removed from featured"
          : "Blog featured successfully"
      );
    } catch (err) {
      console.error("Error toggling featured:", err);
      toast.error("Failed to toggle featured status");
      // Revert optimism
      fetchBlogs();
    }
  };

  const handleDeleteBlog = async (blogSlug, blogTitle) => {
    if (!confirm(`Are you sure you want to delete "${blogTitle}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingBlogId(blogSlug);
    try {
      await api.deleteBlog(token, blogSlug);
      toast.success('Blog deleted successfully');
      fetchBlogs();
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error(error.message || 'Failed to delete blog');
    } finally {
      setDeletingBlogId(null);
    }
  };

  const handleDeletePlaylist = async (playlistId, playlistName) => {
    if (!confirm(`Are you sure you want to delete "${playlistName}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingPlaylistId(playlistId);
    try {
      await api.deletePlaylist(playlistId, token);
      toast.success('Playlist deleted successfully');
      fetchPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error(error.message || 'Failed to delete playlist');
    } finally {
      setDeletingPlaylistId(null);
    }
  };
  const handleSearch = () => {
    setCurrentPage(1);
    setSubmittedSearch(searchQuery.trim());
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  // If we are still checking auth and have no user, show a partial skeleton or nothing,
  // but allow the shell to render.
  // If not authenticated (and done loading), the router push handles it, but we return null to avoid flash.
  if (!authLoading && !isAuthenticated) return null;

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        {userProfile ? (
          <div className="mb-12 border-2 border-foreground p-8 bg-background shadow-[8px_8px_0px_0px_#581c87]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Side: Avatar & Name/Details */}
              <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <div className="absolute inset-0 border-2 border-foreground bg-purple-900 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] overflow-hidden">
                    {(typeof userProfile.profile_image === 'string' ? userProfile.profile_image : userProfile.profile_image?.file_path) ? (
                      <Image
                        src={getImageUrl(typeof userProfile.profile_image === 'string' ? userProfile.profile_image : userProfile.profile_image.file_path)}
                        alt={userProfile.username || 'User'}
                        fill
                        className="object-cover grayscale hover:grayscale-0 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-foreground text-background">
                        <p className="font-mono font-bold uppercase tracking-widest text-3xl">SYS</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center text-center sm:text-left mt-2">
                  <h3 className="font-extrabold text-3xl text-foreground mb-1 uppercase tracking-tighter">
                    {userProfile.full_name || userProfile.email?.split('@')[0] || "User"}
                  </h3>
                  <p className="font-mono font-bold text-xs uppercase tracking-widest text-purple-900 mb-3 border-b-2 border-foreground inline-block pb-1">
                    {userProfile.email}
                  </p>
                  {userProfile.headline && (
                    <p className="font-serif italic text-lg text-foreground mb-2">
                      {userProfile.headline}
                    </p>
                  )}
                  {userProfile.bio && (
                    <p className="font-mono text-xs leading-relaxed text-gray-600 line-clamp-3">
                      {userProfile.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Middle/Right: Stats & Action Stack */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Minimal Stats Row */}
                <div className="flex flex-row items-center justify-between sm:justify-start sm:gap-12 border-b-2 border-foreground pb-6">
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="font-extrabold text-3xl text-foreground leading-none">
                      {userProfile.blog_count || 0}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                      Blogs
                    </span>
                  </div>
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="font-extrabold text-3xl text-foreground leading-none">
                      {userProfile.total_views?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                      Views
                    </span>
                  </div>
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="font-extrabold text-3xl text-foreground leading-none">
                      {userProfile.total_likes?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                      Likes
                    </span>
                  </div>
                  <div className="flex flex-col items-center sm:items-start">
                    <span className="font-extrabold text-xl text-foreground leading-none mt-1">
                      {(userProfile.createdAt || userProfile.created_at) ? new Date(userProfile.createdAt || userProfile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : '—'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                      Since
                    </span>
                  </div>
                </div>

                {/* Dashboard Actions Row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                  <Link
                    href="/my-blogs/create"
                    className="group flex items-center gap-2 px-6 py-3 bg-purple-900 text-white border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    CREATE BLOG
                  </Link>
                  <Link
                    href="/playlists/create"
                    className="group flex items-center gap-2 px-6 py-3 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:bg-purple-900 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <ListMusic className="w-4 h-4" />
                    CREATE PLAYLIST
                  </Link>
                  <Link
                    href={`/blogs/${user?.email}`}
                    className="flex items-center gap-2 px-6 py-3 bg-background text-foreground border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    PUBLIC VIEW
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : profileLoading ? (
          <div className="mb-12 border-2 border-foreground p-8">
            <Skeleton className="w-full h-48 rounded-none" />
          </div>
        ) : null}

        {/* Search / Category / Create Section */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search blogs by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="w-full px-5 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm text-foreground pr-24"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs hover:bg-purple-900 transition-all shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                Search
              </button>
            </div>
          </div>
          {/* Category Pills */}
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-5 py-2 font-mono font-bold uppercase tracking-widest text-xs border-2 border-foreground transition-all shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 ${selectedCategory === category
                  ? "bg-purple-900 text-white"
                  : "bg-background text-foreground"
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Table */}
        {blogsLoading && blogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                </div>
              ))}
            </div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-4">No blogs found</p>
            <p className="text-gray-500">
              Try adjusting your search or create a new blog.
            </p>
          </div>
        ) : (
          <>
            <div className={`bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] overflow-hidden relative transition-opacity duration-200 ${blogsLoading ? 'opacity-50' : 'opacity-100'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-900 border-b-2 border-foreground text-background">
                    <tr>
                      <th className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-xs">Title</th>
                      <th className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-xs">Category</th>
                      {user?.role === 'Admin' && <th className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-xs">Author</th>}
                      <th className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-xs">Date</th>
                      <th className="px-6 py-4 text-center font-mono font-bold uppercase tracking-widest text-xs">Views</th>
                      <th className="px-6 py-4 text-center font-mono font-bold uppercase tracking-widest text-xs">Likes</th>
                      {user?.role === 'Admin' && <th className="px-6 py-4 text-center font-mono font-bold uppercase tracking-widest text-xs">Featured</th>}
                      <th className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y-2 divide-foreground">
                    {blogs.map((blog, index) => (
                      <tr key={blog.id || blog.slug || `blog-${index}`} className="hover:bg-purple-50 transition-colors group">
                        <td className="px-6 py-4">
                          <Link href={(blog.author?.email || blog.author_email || blog.authorUsername) ? `/blogs/${(blog.author?.email || blog.author_email || blog.authorUsername)}/${blog.slug}` : `/blogs/${blog.slug}`} className="text-foreground font-bold hover:text-purple-900 hover:underline transition-all underline-offset-4 decoration-2">
                            {blog.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-[10px] font-mono font-bold bg-foreground text-background border-2 border-foreground inline-block uppercase tracking-widest">
                            {blog.category_name || (typeof blog.category === 'string' ? blog.category : blog.category?.name) || 'General'}
                          </span>
                        </td>
                        {user?.role === 'Admin' && (
                          <td className="px-6 py-4 text-sm font-mono text-foreground font-bold">
                            {blog.author?.full_name || blog.authorFullName || blog.authorUsername || blog.author_email || '—'}
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm font-mono text-foreground">
                          {formatDate(blog.publishedDate || blog.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-foreground">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-mono font-bold">
                              {blog.views !== undefined ? blog.views.toLocaleString() : '0'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-foreground">
                            <Heart className="w-4 h-4" />
                            <span className="text-sm font-mono font-bold">
                              {blog.likes !== undefined ? blog.likes.toLocaleString() : '0'}
                            </span>
                          </div>
                        </td>
                        {user?.role === 'Admin' && (
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleFeatured(blog.id, blog.featured)}
                              className={`flex items-center justify-center gap-1 px-3 py-1 border-2 border-foreground font-mono font-bold text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${blog.featured
                                ? "bg-yellow-400 text-foreground"
                                : "bg-background text-foreground"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <Star className={`w-3 h-3 ${blog.featured ? "fill-current" : ""}`} />
                              {blog.featured ? "Featured" : "Not Featured"}
                            </button>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link href={`/my-blogs/edit/${blog.slug}`} className="text-purple-900 font-mono font-bold text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Edit</Link>
                            <Link href={(blog.author?.email || blog.author_email || blog.authorUsername) ? `/blogs/${(blog.author?.email || blog.author_email || blog.authorUsername)}/${blog.slug}` : `/blogs/${blog.slug}`} className="text-foreground font-mono font-bold text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4">View</Link>
                            <button onClick={() => handleDeleteBlog(blog.slug || blog.id, blog.title)} disabled={deletingBlogId === (blog.slug || blog.id)} className="text-red-600 font-mono font-bold text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4 disabled:opacity-50">
                              {deletingBlogId === (blog.slug || blog.id) ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-16">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isFetchingBlogs}
                  className="flex items-center gap-2 px-4 py-2 font-mono font-bold uppercase tracking-widest text-xs border-2 border-foreground bg-background text-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 hover:bg-purple-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  PREV
                </button>

                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 flex items-center justify-center font-mono font-bold text-sm border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all ${currentPage === page
                          ? "bg-purple-900 text-white"
                          : "bg-background text-foreground"
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || isFetchingBlogs}
                  className="flex items-center gap-2 px-4 py-2 font-mono font-bold uppercase tracking-widest text-xs border-2 border-foreground bg-background text-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 hover:bg-purple-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  NEXT
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Playlists Section */}
        <div className="mb-12 pt-12 border-t-2 border-foreground">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-extrabold text-foreground flex items-center gap-3 uppercase tracking-tighter">
              <ListMusic className="w-8 h-8" />
              My Playlists
            </h2>
          </div>

          {!playlistsLoading && playlists.length === 0 ? (
            <div className="p-8 text-center bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
              <p className="text-foreground font-mono font-bold mb-4 uppercase tracking-widest text-sm">NO PLAYLISTS FOUND.</p>
              <Link href="/playlists/create" className="text-purple-900 font-mono font-bold text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                CREATE INITIAL PLAYLIST
              </Link>
            </div>
          ) : playlistsLoading ? (
            <div className="bg-background border-2 border-foreground p-6 shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-1/3 rounded-none" />
                    <Skeleton className="h-4 w-1/6 rounded-none" />
                    <Skeleton className="h-4 w-1/6 rounded-none" />
                    <Skeleton className="h-4 w-1/6 rounded-none" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-900 border-b-2 border-foreground text-background">
                    <tr>
                      <th className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-xs">Playlist Name</th>
                      <th className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-xs">Visibility</th>
                      <th className="px-6 py-4 text-center font-mono font-bold uppercase tracking-widest text-xs">Blogs</th>
                      <th className="px-6 py-4 text-center font-mono font-bold uppercase tracking-widest text-xs">Views</th>
                      <th className="px-6 py-4 text-center font-mono font-bold uppercase tracking-widest text-xs">Likes</th>
                      <th className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y-2 divide-foreground">
                    {playlists.map((playlist) => (
                      <tr key={playlist.id || playlist.slug} className="hover:bg-purple-50 transition-colors group">
                        <td className="px-6 py-4">
                          <Link href={`/playlists/${user?.email}/${playlist.slug}`} className="text-foreground font-bold hover:text-purple-900 hover:underline transition-all flex items-center gap-3 underline-offset-4 decoration-2">
                            <div className="w-8 h-8 border-2 border-foreground bg-foreground text-background flex items-center justify-center shrink-0">
                              <ListMusic className="w-4 h-4" />
                            </div>
                            <span className="truncate max-w-[200px]">{playlist.name}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-[10px] font-mono font-bold border-2 border-foreground uppercase tracking-widest ${playlist.is_public ? 'bg-green-400 text-foreground' : 'bg-background text-foreground'}`}>
                            {playlist.is_public ? 'Public' : 'Private'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-foreground font-bold text-sm">
                          {playlist.blog_count || 0}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-foreground">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-mono font-bold">
                              {(playlist.total_views || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-foreground">
                            <Heart className="w-4 h-4" />
                            <span className="text-sm font-mono font-bold">
                              {(playlist.total_likes || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <Link href={`/playlists/${user?.email}/${playlist.slug}`} className="text-foreground font-mono font-bold text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4">View</Link>
                            <Link href={`/playlists/edit/${playlist.slug}`} className="text-purple-900 font-mono font-bold text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Edit</Link>
                            <button onClick={() => handleDeletePlaylist(playlist.slug, playlist.name)} disabled={deletingPlaylistId === playlist.slug} className="text-red-600 font-mono font-bold text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4 disabled:opacity-50">
                              {deletingPlaylistId === playlist.slug ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Playlist Pagination */}
          {playlistTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPlaylistPage((prev) => Math.max(prev - 1, 1))}
                disabled={playlistPage === 1 || playlistsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                {[...Array(playlistTotalPages)].map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setPlaylistPage(page)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all duration-300 ${playlistPage === page
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                        : "bg-white text-gray-700 border border-gray-300 hover:border-indigo-500 hover:text-indigo-600"
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPlaylistPage((prev) => Math.min(prev + 1, playlistTotalPages))}
                disabled={playlistPage === playlistTotalPages || playlistsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>



      </div>
    </div>
  );
}
