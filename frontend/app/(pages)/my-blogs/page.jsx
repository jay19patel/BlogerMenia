"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, Eye, Heart, Star, BookOpen, ListMusic, Edit2, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import LoaderCard from "@/components/ui/loader";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";

export default function MyBlogsPage() {
  const { isAuthenticated, user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  // Split loading: initial data load vs list updates
  const [initialBlogsLoading, setInitialBlogsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [previousSearchQuery, setPreviousSearchQuery] = useState(""); // Track previous search value
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [togglingFeatured, setTogglingFeatured] = useState({});
  const blogsPerPage = 10;
  const [categories, setCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [playlists, setPlaylists] = useState([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState(null);

  // Common function to fetch blogs - Uses authenticated endpoint for security
  const fetchBlogs = async (searchValue = null, skipValue = null) => {
    try {
      // CRITICAL: Ensure user is authenticated and has token before fetching
      if (!isAuthenticated || !token) {
        console.warn("Cannot fetch blogs: User not authenticated");
        setBlogs([]);
        setTotalBlogs(0);
        return;
      }

      setListLoading(true);
      const skip = skipValue !== null ? skipValue : (currentPage - 1) * blogsPerPage;
      const search = searchValue !== null ? searchValue : (searchQuery && searchQuery.trim().length > 0 ? searchQuery.trim() : null);
      
      // CRITICAL: Use authenticated endpoint that automatically filters by current_user
      // This ensures ONLY logged-in user's blogs are returned, no other user's data
      const response = await api.getMyBlogs(
        token,  // Required: authentication token
        search,
        skip,
        blogsPerPage,
        selectedCategory !== 'All' ? selectedCategory : undefined
      );
      setBlogs(response.blogs || []);
      setTotalBlogs(response.total || 0);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast.error("Failed to load blogs");
      setBlogs([]);
      setTotalBlogs(0);
    } finally {
      setListLoading(false);
      setInitialBlogsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    // Fetch blogs on initial load and when category/page changes (not on search query change)
    fetchBlogs();
  }, [authLoading, isAuthenticated, currentPage, selectedCategory]); // Removed searchQuery from dependencies

  // Auto-fetch when input field is cleared (was filled before, now empty)
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    // If previous search had value and current is empty, auto-fetch
    if (previousSearchQuery && previousSearchQuery.trim().length > 0 && 
        (!searchQuery || searchQuery.trim().length === 0)) {
      setCurrentPage(1); // Reset to page 1
      fetchBlogs(null, 0); // Fetch without search query
      setPreviousSearchQuery(""); // Reset previous search
    }
  }, [searchQuery, previousSearchQuery, authLoading, isAuthenticated]);

  // Handle search button click
  const handleSearch = () => {
    setCurrentPage(1); // Reset to page 1 on search
    const searchValue = searchQuery && searchQuery.trim().length > 0 ? searchQuery.trim() : null;
    setPreviousSearchQuery(searchValue || ""); // Track the search value
    fetchBlogs(searchValue, 0); // Fetch with search query
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Fetch categories for logged-in user only - Same approach as /blogs/username
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.username) return;
    const loadCategories = async () => {
      try {
        // CRITICAL: Pass username to filter categories by logged-in user (same as /blogs/username)
        const resp = await api.getBlogCategories(user.username);
        const cats = resp.categories || [];
        setCategories(["All", ...cats]);
      } catch (e) {
        console.error("Error loading categories:", e);
        setCategories(["All"]);
      }
    };
    loadCategories();
  }, [authLoading, isAuthenticated, user?.username]);

  // Fetch playlists for this user
  useEffect(() => {
    if (authLoading || !isAuthenticated || !token) return;
    const loadPlaylists = async () => {
      try {
        const response = await api.getMyPlaylists(token);
        setPlaylists(response.playlists || []);
      } catch (e) {
        console.error('Error loading playlists:', e);
      }
    };
    loadPlaylists();
  }, [authLoading, isAuthenticated, token]);

  const totalPages = Math.ceil(totalBlogs / blogsPerPage);

  const handleToggleFeatured = async (blogId, currentFeatured) => {
    try {
      setTogglingFeatured(prev => ({ ...prev, [blogId]: true }));
      await api.toggleFeaturedBlog(token, blogId);
      
      // Update local state
      setBlogs(prevBlogs => 
        prevBlogs.map(blog => 
          blog.id === blogId 
            ? { ...blog, featured: !currentFeatured }
            : blog
        )
      );
      
      toast.success(
        currentFeatured 
          ? "Blog removed from featured" 
          : "Blog featured successfully"
      );
    } catch (error) {
      console.error("Error toggling featured:", error);
      toast.error("Failed to toggle featured status");
    } finally {
      setTogglingFeatured(prev => ({ ...prev, [blogId]: false }));
    }
  };

  const handleDeletePlaylist = async (playlistId, playlistName) => {
    if (!confirm(`Are you sure you want to delete "${playlistName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingPlaylistId(playlistId);
      await api.deletePlaylist(playlistId, token);
      toast.success('Playlist deleted successfully');
      // Reload playlists
      const response = await api.getMyPlaylists(token);
      setPlaylists(response.playlists || []);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error(error.message || 'Failed to delete playlist');
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Blogs</h1>
              <p className="text-gray-600">
                Manage and view all your blogs in one place
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/my-blogs/create"
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Create Blog
              </Link>
            </div>
          </div>

          {/* Playlists Section */}
          {playlists.length > 0 && (
            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  My Playlists
                </h2>
                <Link
                  href={`/blogs/${user.username}`}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {playlists.slice(0, 5).map((playlist) => (
                  <div
                    key={playlist.id}
                    className="group relative p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all"
                  >
                    <Link
                      href={`/playlists/${user.username}/${playlist.slug}`}
                      className="block"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {playlist.blog_count || 0}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {playlist.name}
                      </h3>
                    </Link>
                    
                    {/* Edit and Delete Buttons */}
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                      <Link
                        href={`/playlists/${user.username}/${playlist.slug}`}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeletePlaylist(playlist.id, playlist.name);
                        }}
                        disabled={deletingPlaylistId === playlist.id}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingPlaylistId === playlist.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search / Category / Create Section */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search blogs by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
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
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }}
                className={`px-5 py-2 rounded-lg font-medium transition-all duration-300 ${
                  selectedCategory === category
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
        {initialBlogsLoading ? (
          <div className="relative py-12">
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderCard message="Loading blogs…" />
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
              {listLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <LoaderCard message="Updating results…" />
                </div>
              )}
              <div className={`overflow-x-auto ${listLoading ? 'opacity-50 pointer-events-none' : ''}`}>
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
                            href={blog.authorUsername ? `/blogs/${blog.authorUsername}/${blog.slug}` : `/blogs/${blog.slug}`}
                            className="text-gray-900 font-medium hover:text-indigo-600 transition-colors"
                          >
                            {blog.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                            {blog.category}
                          </span>
                        </td>
                        {user?.role === 'Admin' && (
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {blog.author || '—'}
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(blog.publishedDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
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
                              disabled={togglingFeatured[blog.id]}
                              className={`flex items-center justify-center gap-1 px-3 py-1 rounded-lg transition-all duration-300 ${
                                blog.featured
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
                              href={`/my-blogs/edit/${blog.id}`}
                              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                            >
                              Edit
                            </Link>
                            <Link
                              href={blog.authorUsername ? `/blogs/${blog.authorUsername}/${blog.slug}` : `/blogs/${blog.slug}`}
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
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
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
                        className={`w-10 h-10 rounded-lg font-medium transition-all duration-300 ${
                          currentPage === page
                            ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-indigo-500"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}

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

