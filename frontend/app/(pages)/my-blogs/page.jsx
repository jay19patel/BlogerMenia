"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Plus, Eye, Heart, Star, ListMusic } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getBlogDate, formatDate, getImageUrl } from "@/lib/utils";
import Image from "next/image";
import ProfileHeader from "@/components/ProfileHeader";
import CategoryPills from "@/components/ui/category-pills";
import Pagination from "@/components/ui/pagination";
import SearchBar from "@/components/ui/search-bar";

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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
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
        const categoryNames = (data.categories || []).map((category) =>
          typeof category === "string" ? category : category.name
        );
        setCategories(["All", ...categoryNames]);
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

  const profileActions = (
    <>
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
    </>
  );

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Shared Profile Header */}
        <ProfileHeader
          profile={userProfile}
          loading={profileLoading}
          actions={profileActions}
        />

        {/* Search & Category Filter */}
        <div className="mb-6 flex flex-col gap-4">
          <SearchBar
            id="my-blogs-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSubmit={handleSearch}
            placeholder="SEARCH BLOGS BY TITLE..."
            buttonLabel="Search"
            disabled={blogsLoading}
          />
          <CategoryPills
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={handleCategoryChange}
          />
        </div>

        {/* Blog Table */}
        {blogsLoading && blogs.length === 0 ? (
          <div className="bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] overflow-hidden p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-1/3 rounded-none" />
                  <Skeleton className="h-4 w-1/6 rounded-none" />
                  <Skeleton className="h-4 w-1/6 rounded-none" />
                  <Skeleton className="h-4 w-1/6 rounded-none" />
                </div>
              ))}
            </div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16 bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] my-6">
            <h3 className="text-2xl font-extrabold text-foreground mb-4 uppercase tracking-tight">
              {submittedSearch || selectedCategory !== "All" ? "SYSTEM.NO_MATCH" : "SYSTEM.EMPTY_INDEX"}
            </h3>
            <p className="text-gray-600 font-mono text-sm mb-6 uppercase tracking-wider">
              {submittedSearch || selectedCategory !== "All"
                ? `No blogs matched current filters / search query.`
                : "No blogs found in your index."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                href="/my-blogs/create"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-900 text-white border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                <Plus className="w-4 h-4" />
                CREATE NEW BLOG
              </Link>
              {(submittedSearch || selectedCategory !== "All") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSubmittedSearch("");
                    setSelectedCategory("All");
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-background text-foreground border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                >
                  RESET FILTERS
                </button>
              )}
            </div>
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
                          {formatDate(getBlogDate(blog), "Date")}
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

            {/* Pagination — shared brutalist component */}
            <div className="mb-16">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                disabled={isFetchingBlogs}
              />
            </div>
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

          {/* Playlist Pagination — brutalist shared component */}
          <Pagination
            currentPage={playlistPage}
            totalPages={playlistTotalPages}
            onPageChange={setPlaylistPage}
            disabled={playlistsLoading}
          />
        </div>



      </div>
    </div>
  );
}
