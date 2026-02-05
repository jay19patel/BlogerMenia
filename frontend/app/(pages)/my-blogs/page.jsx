"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, Eye, Heart, Star, BookOpen, ListMusic, Edit2, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import LoaderCard from "@/components/ui/loader";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

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

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push("/login"); // Or return null/loader while redirecting
  }

  // 1. Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ["blogCategories", user?.username],
    queryFn: () => api.getBlogCategories(user.username),
    enabled: !!user?.username,
    select: (data) => ["All", ...(data.categories || [])],
  });
  const categories = categoriesData || ["All"];

  // 2. Fetch Playlists
  const { data: playlistsData } = useQuery({
    queryKey: ["myPlaylists", token],
    queryFn: () => api.getMyPlaylists(token),
    enabled: !!token,
  });
  const playlists = playlistsData?.playlists || [];

  // 3. Fetch Blogs (Main Query)
  const {
    data: blogsData,
    isLoading: blogsLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: [
      "myBlogs",
      token,
      {
        search: submittedSearch || null,
        category: selectedCategory === "All" ? null : selectedCategory,
        page: currentPage,
      },
    ],
    queryFn: () => {
      const skip = (currentPage - 1) * BLOGS_PER_PAGE;
      const search =
        submittedSearch && submittedSearch.trim().length > 0
          ? submittedSearch.trim()
          : null;
      const filter = selectedCategory === "All" ? null : selectedCategory;
      // CRITICAL: api.getMyBlogs requires token
      return api.getMyBlogs(token, search, skip, BLOGS_PER_PAGE, filter);
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const blogs = blogsData?.blogs || [];
  const totalBlogs = blogsData?.total || 0;
  const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

  // Mutations
  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ blogId, currentFeatured }) =>
      api.toggleFeaturedBlog(token, blogId),
    onMutate: async ({ blogId, currentFeatured }) => {
      await queryClient.cancelQueries(["myBlogs"]);
      const previousBlogs = queryClient.getQueryData(["myBlogs"]);

      // Optimistic update
      queryClient.setQueriesData({ queryKey: ["myBlogs"] }, (old) => {
        if (!old) return old;
        // Since this runs across multiple pages/filters, we might need a more specific update
        // But generally setQueriesData with partial matching works if structure matches.
        // However, for precise page update, it's safer to just iterate active queries
        // For simplicity here, we invalidate or use simpler query key matching.
        // React Query v5 syntax:
        return {
          ...old,
          blogs: old.blogs.map((b) =>
            b.id === blogId ? { ...b, featured: !currentFeatured } : b
          ),
          total: old.total
        };
      });

      return { previousBlogs };
    },
    onError: (err, newTodo, context) => {
      console.error("Error toggling featured:", err);
      toast.error("Failed to toggle featured status");
      if (context?.previousBlogs) {
        // queryClient.setQueriesData(["myBlogs"], context.previousBlogs); // Revert? complex with varying keys
        // Easier: just invalidate
        queryClient.invalidateQueries(["myBlogs"]);
      }
    },
    onSuccess: (data, { currentFeatured }) => {
      toast.success(
        currentFeatured
          ? "Blog removed from featured"
          : "Blog featured successfully"
      );
      queryClient.invalidateQueries(["myBlogs"]);
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: (playlistId) => api.deletePlaylist(playlistId, token),
    onMutate: (playlistId) => {
      setDeletingPlaylistId(playlistId);
    },
    onSuccess: () => {
      toast.success('Playlist deleted successfully');
      queryClient.invalidateQueries(["myPlaylists"]);
    },
    onError: (error) => {
      console.error('Error deleting playlist:', error);
      toast.error(error.message || 'Failed to delete playlist');
    },
    onSettled: () => {
      setDeletingPlaylistId(null);
    }
  });


  // Handlers
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

  const handleToggleFeatured = (blogId, currentFeatured) => {
    toggleFeaturedMutation.mutate({ blogId, currentFeatured });
  };

  const handleDeletePlaylist = (playlistId, playlistName) => {
    if (!confirm(`Are you sure you want to delete "${playlistName}"? This action cannot be undone.`)) {
      return;
    }
    deletePlaylistMutation.mutate(playlistId);
  };

  if (authLoading || (isAuthenticated && !token)) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <LoaderCard message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) return null; // Router will redirect

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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {playlists.slice(0, 5).map((playlist) => (
                  <div
                    key={playlist.id}
                    className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <Link
                      href={`/playlists/${user.username}/${playlist.slug}`}
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
                        href={`/playlists/${user.username}/${playlist.slug}`}
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
          <div className="relative py-12">
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderCard message="Loading blogs..." />
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
              {/* Overlay removed for smoother transition */}
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
                            href={blog.authorUsername ? `/blogs/${blog.authorUsername}/${blog.slug}` : `/blogs/${blog.slug}`}
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
                              disabled={toggleFeaturedMutation.isPending}
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
                  disabled={currentPage === 1 || isPlaceholderData}
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
                        disabled={isPlaceholderData}
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
                  disabled={currentPage === totalPages || isPlaceholderData}
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

