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
import { formatDate } from "@/lib/utils";

const BLOGS_PER_PAGE = 10;

export default function MyBlogsPage() {
  const { isAuthenticated, user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
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
      // Using naya optimized method from UserProfile pattern
      const data = await api.getUserPlaylistsByEmail(user.email, userId, token, true);
      setPlaylists(data?.playlists || []);
    } catch (e) {
      console.error("Failed to fetch playlists", e);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [token, user?.email]);

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
    fetchBlogs();
  }, [token, submittedSearch, selectedCategory, currentPage]);

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
          <div className="mb-12 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="w-full h-24 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600"></div>
            <div className="px-8 py-6">
              <div className="flex items-center justify-center sm:justify-start mb-4 -mt-12">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-white rounded-full overflow-hidden shadow-lg bg-white">
                    {userProfile.profile_image ? (
                      <img
                        src={typeof userProfile.profile_image === 'string' ? userProfile.profile_image : userProfile.profile_image.file_path}
                        alt={userProfile.full_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <UserIcon className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{userProfile.full_name}</h1>
                  <p className="text-gray-500">{userProfile.email}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/my-blogs/create"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    New Blog
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                <div className="text-center md:border-r border-gray-100">
                  <div className="text-2xl font-bold text-gray-900">{userProfile.blog_count || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Blogs</div>
                </div>
                <div className="text-center md:border-r border-gray-100">
                  <div className="text-2xl font-bold text-gray-900">{userProfile.total_views?.toLocaleString() || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Total Views</div>
                </div>
                <div className="text-center md:border-r border-gray-100">
                  <div className="text-2xl font-bold text-gray-900">{userProfile.total_likes?.toLocaleString() || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Total Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatDate(userProfile.created_at, "Never")}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Joined</div>
                </div>
              </div>
            </div>
          </div>
        ) : profileLoading ? (
          <div className="mb-12">
            <Skeleton className="w-full h-64 rounded-2xl" />
          </div>
        ) : null}

        {/* Playlists Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ListMusic className="w-6 h-6 text-indigo-600" />
              My Playlists
            </h2>
            <Link
              href={`/blogs/${user?.email}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Public Profile View →
            </Link>
          </div>

          {!playlistsLoading && playlists.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 mb-2">You haven't created any playlists yet.</p>
              <Link href="/playlists/create" className="text-indigo-600 font-medium hover:underline text-sm">
                Create your first playlist
              </Link>
            </div>
          ) : playlistsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
                >
                  <Link href={`/playlists/${user?.email}/${playlist.slug}`} className="block">
                    <div className="aspect-video bg-indigo-50 flex items-center justify-center relative">
                      {(playlist.cover_image || playlist.thumbnail) ? (
                        <img
                          src={typeof (playlist.cover_image || playlist.thumbnail) === 'string' ? (playlist.cover_image || playlist.thumbnail) : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ListMusic className="w-10 h-10 text-indigo-200" />
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {playlist.blog_count || 0} blogs
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {playlist.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${playlist.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {playlist.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex border-t border-gray-100 divide-x divide-gray-100">
                    <Link
                      href={`/playlists/${user?.email}/${playlist.slug}`}
                      className="flex-1 py-2 text-center text-xs text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                    >
                      View/Edit
                    </Link>
                    <button
                      onClick={() => handleDeletePlaylist(playlist.slug, playlist.name)}
                      disabled={deletingPlaylistId === playlist.slug}
                      className="flex-1 py-2 text-center text-xs text-red-600 hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
                    >
                      {deletingPlaylistId === playlist.slug ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
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
