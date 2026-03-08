"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, Eye, Heart, Star, BookOpen, ListMusic, Edit2, Trash2, Loader2, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, getImageUrl } from "@/lib/utils";

const BLOGS_PER_PAGE = 10;

export default function MyBlogsPage() {
  const { isAuthenticated, user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [playlistPage, setPlaylistPage] = useState(1);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState(null);

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
    if (!token || !user) return;
    try {
      setPlaylistsLoading(true);
      const userId = user.id || user._id;
      const skip = (playlistPage - 1) * PLAYLISTS_PER_PAGE;
      const data = await api.getUserPlaylistsByEmail(user.email, userId, token, true, skip, PLAYLISTS_PER_PAGE);
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
  }, [token, user?.email, playlistPage]);

  const playlistTotalPages = Math.ceil(totalPlaylists / PLAYLISTS_PER_PAGE);

  // Fetch Blogs
  const fetchBlogs = async () => {
    if (!token || !user) return;
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
  }, [token, user?.email, submittedSearch, selectedCategory, currentPage]);

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
        {/* Profile Header & Stats */}
        {userProfile ? (
          <div className="mb-12 border border-gray-200 rounded-3xl p-8 bg-white shadow-xl shadow-gray-100/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Side: Avatar & Name/Details */}
              <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-8">
                <div className="relative w-32 h-32 shrink-0 group">
                  <div className="absolute inset-0 border-[3px] border-indigo-100 rounded-full overflow-hidden shadow-inner group-hover:border-indigo-400 transition-all duration-300">
                    {userProfile.profile_image ? (
                      <img
                        src={getImageUrl(typeof userProfile.profile_image === 'string' ? userProfile.profile_image : userProfile.profile_image.file_path)}
                        alt={userProfile.full_name || 'User'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <UserIcon className="w-14 h-14 text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                      {userProfile.full_name || userProfile.email?.split('@')[0]}
                    </h1>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-indigo-100">
                      Author
                    </span>
                  </div>
                  <p className="font-semibold text-indigo-600 mb-4 flex items-center justify-center sm:justify-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    {userProfile.email}
                  </p>

                  {userProfile.headline && (
                    <p className="font-bold text-gray-800 text-sm mb-2">
                      {userProfile.headline}
                    </p>
                  )}
                  {userProfile.bio && (
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 max-w-sm">
                      {userProfile.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Side: Stats & Action Stack */}
              <div className="lg:col-span-7 flex flex-col gap-8">
                {/* Minimal Stats Row */}
                <div className="flex flex-row items-center justify-between sm:justify-start sm:gap-14 border-b border-gray-100 pb-8">
                  <div className="flex flex-col items-center sm:items-start group cursor-default">
                    <span className="font-black text-3xl text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">
                      {userProfile.blog_count || 0}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">
                      Blogs
                    </span>
                  </div>
                  <div className="flex flex-col items-center sm:items-start group cursor-default">
                    <span className="font-black text-3xl text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">
                      {userProfile.total_views?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">
                      Views
                    </span>
                  </div>
                  <div className="flex flex-col items-center sm:items-start group cursor-default">
                    <span className="font-black text-3xl text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">
                      {userProfile.total_likes?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">
                      Likes
                    </span>
                  </div>
                  <div className="flex flex-col items-center sm:items-start group cursor-default">
                    <span className="font-black text-xl text-gray-900 leading-none group-hover:text-indigo-600 transition-colors mt-1">
                      {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : '—'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">
                      Since
                    </span>
                  </div>
                </div>

                {/* Dashboard Actions Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/my-blogs/create"
                    className="group flex items-center gap-2.5 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    <span className="text-sm">Create Blog</span>
                  </Link>
                  <Link
                    href="/playlists/create"
                    className="group flex items-center gap-2.5 px-6 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"
                  >
                    <ListMusic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Create Playlist</span>
                  </Link>
                  <Link
                    href={`/blogs/${user?.email}`}
                    className="flex items-center gap-2.5 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm"
                  >
                    <Eye className="w-5 h-5 text-gray-400" />
                    Public View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : profileLoading ? (
          <div className="mb-12">
            <Skeleton className="w-full h-64 rounded-2xl" />
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
                className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
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
                className={`px-5 py-2 rounded-lg font-medium transition-all duration-300 ${selectedCategory === category
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-indigo-500 hover:text-indigo-600"
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
            <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative transition-opacity duration-200 ${blogsLoading ? 'opacity-50' : 'opacity-100'}`}>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                      {user?.role === 'Admin' && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Author
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Likes
                      </th>
                      {user?.role === 'Admin' && (
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Featured
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {blogs.map((blog, index) => (
                      <tr key={blog.id || blog.slug || `blog-${index}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={(blog.author?.email || blog.author_email || blog.authorUsername) ? `/blogs/${(blog.author?.email || blog.author_email || blog.authorUsername)}/${blog.slug}` : `/blogs/${blog.slug}`}
                            className="text-gray-900 font-medium hover:text-indigo-600 transition-colors"
                          >
                            {blog.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                            {blog.category_name || (typeof blog.category === 'string' ? blog.category : blog.category?.name) || 'General'}
                          </span>
                        </td>
                        {user?.role === 'Admin' && (
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {blog.author?.full_name || blog.authorFullName || blog.authorUsername || blog.author_email || '—'}
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(blog.publishedDate || blog.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-600">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {blog.views !== undefined ? blog.views.toLocaleString() : '0'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-600">
                            <Heart className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {blog.likes !== undefined ? blog.likes.toLocaleString() : '0'}
                            </span>
                          </div>
                        </td>
                        {user?.role === 'Admin' && (
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleFeatured(blog.id, blog.featured)}
                              className={`flex items-center justify-center gap-1 px-3 py-1 rounded-lg transition-all duration-300 ${blog.featured
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={blog.featured ? "Remove from featured" : "Add to featured"}
                            >
                              <Star className={`w-4 h-4 ${blog.featured ? "fill-current" : ""}`} />
                              <span className="text-xs font-medium">
                                {blog.featured ? "Featured" : "Not Featured"}
                              </span>
                            </button>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/my-blogs/edit/${blog.slug}`}
                              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                            >
                              Edit
                            </Link>
                            <Link
                              href={(blog.author?.email || blog.author_email || blog.authorUsername) ? `/blogs/${(blog.author?.email || blog.author_email || blog.authorUsername)}/${blog.slug}` : `/blogs/${blog.slug}`}
                              className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => {
                                setSelectedBlog(blog);
                                setShowAddToPlaylist(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                              title="Playlist"
                            >
                              Playlist
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all duration-300 ${currentPage === page
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
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || isFetchingBlogs}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Playlists Section */}
        <div className="mb-12 pt-12 border-t border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ListMusic className="w-6 h-6 text-indigo-600" />
              My Playlists
            </h2>
          </div>

          {!playlistsLoading && playlists.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 mb-2">You haven't created any playlists yet.</p>
              <Link href="/playlists/create" className="text-indigo-600 font-medium hover:underline text-sm">
                Create your first playlist
              </Link>
            </div>
          ) : playlistsLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Playlist Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Visibility
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Blogs
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Likes
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {playlists.map((playlist) => (
                      <tr key={playlist.id || playlist.slug} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={`/playlists/${user?.email}/${playlist.slug}`}
                            className="text-gray-900 font-medium hover:text-indigo-600 transition-colors flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center shrink-0">
                              <ListMusic className="w-4 h-4 text-indigo-400" />
                            </div>
                            <span className="truncate max-w-[200px]">{playlist.name}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${playlist.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {playlist.is_public ? 'Public' : 'Private'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-gray-700 text-sm">
                          {playlist.blog_count || 0}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-gray-600">
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">
                              {(playlist.total_views || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-gray-600">
                            <Heart className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">
                              {(playlist.total_likes || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <Link
                              href={`/playlists/${user?.email}/${playlist.slug}`}
                              className="text-indigo-600 hover:text-indigo-700 font-semibold text-xs uppercase tracking-wider"
                            >
                              View
                            </Link>
                            <Link
                              href={`/playlists/edit/${playlist.slug}`}
                              className="text-violet-600 hover:text-violet-700 font-semibold text-xs uppercase tracking-wider"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDeletePlaylist(playlist.slug, playlist.name)}
                              disabled={deletingPlaylistId === playlist.slug}
                              className="text-red-600 hover:text-red-700 font-semibold text-xs uppercase tracking-wider disabled:opacity-50"
                            >
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



        {/* Add to Playlist Dialog */}
        {showAddToPlaylist && selectedBlog && (
          <AddToPlaylistDialog
            isOpen={showAddToPlaylist}
            onClose={() => {
              setShowAddToPlaylist(false);
              setSelectedBlog(null);
            }}
            blogData={selectedBlog}
            token={token}
          />
        )}
      </div>
    </div>
  );
}
