"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, Eye, Heart, Star, BookOpen, ListMusic, Edit2, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";
import { Skeleton } from "@/components/ui/skeleton";

const BLOGS_PER_PAGE = 10;

export default function MyBlogsPage() {
  const { isAuthenticated, user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState(null);

  const [categories, setCategories] = useState(["All"]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [isFetchingBlogs, setIsFetchingBlogs] = useState(false);
  const [totalBlogs, setTotalBlogs] = useState(0);

  // Redirect if definitely not authenticated and not loading
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

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
      const data = await api.getMyPlaylists(token, userId);
      setPlaylists(data?.playlists || []);
    } catch (e) {
      console.error("Failed to fetch playlists", e);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [token]);

  // Fetch Blogs
  const fetchBlogs = async () => {
    if (!token) return;
    setIsFetchingBlogs(true);
    if (blogs.length === 0) setBlogsLoading(true);
    try {
      const skip = (currentPage - 1) * BLOGS_PER_PAGE;
      const search =
        submittedSearch && submittedSearch.trim().length > 0
          ? submittedSearch.trim()
          : null;
      const filter = selectedCategory === "All" ? null : selectedCategory;
      const data = await api.getMyBlogs(token, search, skip, BLOGS_PER_PAGE, filter);
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
    fetchBlogs();
  }, [token, submittedSearch, selectedCategory, currentPage]);

  const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

  // Handlers
  const handleToggleFeatured = async (blogId, currentFeatured) => {
    try {
      // Optimistic Update
      setBlogs(prev => prev.map(b => b.id === blogId ? { ...b, featured: !currentFeatured } : b));

      await api.toggleFeaturedBlog(token, blogId);
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
          <div className="mb-6">
            {!playlistsLoading && playlists.length === 0 ? null : (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ListMusic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    My Playlists
                  </h2>
                  <Link
                    href={`/blogs/${user?.email}`}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    View All →
                  </Link>
                </div>

                {playlistsLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {playlists.slice(0, 5).map((playlist) => (
                      <div
                        key={playlist.id}
                        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <Link
                          href={`/playlists/${user?.email}/${playlist.slug}`}
                          className="block p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                              <ListMusic className="w-5 h-5" />
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                              <BookOpen className="w-3 h-3" />
                              {playlist.blog_count || 0}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {playlist.name}
                          </h3>
                          {playlist.is_public === false && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              Private
                            </span>
                          )}
                        </Link>

                        {/* Quick Actions */}
                        <div className="flex border-t border-gray-100 dark:border-gray-700">
                          <Link
                            href={`/playlists/${user?.email}/${playlist.slug}`}
                            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </Link>
                          <div className="w-px bg-gray-100 dark:bg-gray-700" />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeletePlaylist(playlist.slug, playlist.name);
                            }}
                            disabled={deletingPlaylistId === playlist.slug}
                            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50"
                          >
                            {deletingPlaylistId === playlist.slug ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
        {!blogsData && blogsLoading ? (
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
              <div className="flex items-center justify-center gap-2 mt-8">
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
                        disabled={isFetchingBlogs}
                        className={`w-10 h-10 rounded-lg font-medium transition-all duration-300 ${currentPage === page
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
