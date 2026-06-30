"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Plus, Eye, Heart, Star, ListMusic } from "lucide-react";

const LinkedInIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getBlogDate, formatDate } from "@/lib/utils";
import ProfileHeader from "@/components/ProfileHeader";
import CategoryPills from "@/components/ui/category-pills";
import Pagination from "@/components/ui/pagination";
import SearchBar from "@/components/ui/search-bar";
import { cn } from "@/lib/utils";

const BLOGS_PER_PAGE = 10;
const PLAYLISTS_PER_PAGE = 5;

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
  const [linkedinLinked, setLinkedinLinked] = useState(false);
  const [linkedinSharedPosts, setLinkedinSharedPosts] = useState([]);
  const [sharingToLinkedIn, setSharingToLinkedIn] = useState(null);

  const [categories, setCategories] = useState(["All"]);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [isFetchingBlogs, setIsFetchingBlogs] = useState(false);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [totalPlaylists, setTotalPlaylists] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;
      try {
        setProfileLoading(true);
        const profile = await api.getUserProfileByEmail(user.email);
        setUserProfile(profile);
        setLinkedinLinked(!!profile.linkedinId);
        setLinkedinSharedPosts(profile.linkedin_shared_posts || []);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user?.email]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user?.email) return;
      try {
        const data = await api.getBlogCategories(user.email);
        const categoryNames = (data.categories || []).map((c) => typeof c === "string" ? c : c.name);
        setCategories(["All", ...categoryNames]);
      } catch (e) {
        console.error("Failed to fetch categories", e);
      }
    };
    fetchCategories();
  }, [user?.email]);

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

  useEffect(() => { fetchPlaylists(); }, [user?.email, playlistPage]);

  const playlistTotalPages = Math.ceil(totalPlaylists / PLAYLISTS_PER_PAGE);

  const fetchBlogs = async () => {
    if (!user) return;
    setIsFetchingBlogs(true);
    if (blogs.length === 0) setBlogsLoading(true);
    try {
      const skip = (currentPage - 1) * BLOGS_PER_PAGE;
      const search = submittedSearch?.trim().length > 0 ? submittedSearch.trim() : null;
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

  useEffect(() => { if (user) fetchBlogs(); }, [user?.email, submittedSearch, selectedCategory, currentPage]);

  const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

  const handleToggleFeatured = async (blogId, currentFeatured) => {
    try {
      setBlogs(prev => prev.map(b => b.id === blogId ? { ...b, featured: !currentFeatured } : b));
      await api.toggleFeaturedBlog(token, blogId, !currentFeatured);
      toast.success(currentFeatured ? "Blog removed from featured" : "Blog featured successfully");
    } catch (err) {
      toast.error("Failed to toggle featured status");
      fetchBlogs();
    }
  };

  const handleDeleteBlog = async (blogSlug, blogTitle) => {
    if (!confirm(`Delete "${blogTitle}"? This cannot be undone.`)) return;
    setDeletingBlogId(blogSlug);
    try {
      await api.deleteBlog(token, blogSlug);
      toast.success('Blog deleted');
      fetchBlogs();
    } catch (error) {
      toast.error(error.message || 'Failed to delete blog');
    } finally {
      setDeletingBlogId(null);
    }
  };

  const handleDeletePlaylist = async (playlistId, playlistName) => {
    if (!confirm(`Delete "${playlistName}"? This cannot be undone.`)) return;
    setDeletingPlaylistId(playlistId);
    try {
      await api.deletePlaylist(playlistId, token);
      toast.success('Playlist deleted');
      fetchPlaylists();
    } catch (error) {
      toast.error(error.message || 'Failed to delete playlist');
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleShareToLinkedIn = async (blog) => {
    if (!linkedinLinked) { toast.error("Connect LinkedIn first from your Profile settings."); return; }
    setSharingToLinkedIn(blog.slug);
    try {
      const blogUrl = `${window.location.origin}/blogs/${blog.author?.email || user?.email}/${blog.slug}`;
      const res = await fetch("/api/linkedin/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogSlug: blog.slug, blogTitle: blog.title, blogExcerpt: blog.excerpt || "", blogUrl }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || "Failed to share on LinkedIn"); return; }
      setLinkedinSharedPosts((prev) => [...prev, blog.slug]);
      toast.success("Shared to LinkedIn!");
    } catch { toast.error("Failed to share on LinkedIn"); }
    finally { setSharingToLinkedIn(null); }
  };

  if (!authLoading && !isAuthenticated) return null;

  const profileActions = (
    <>
      <Button asChild size="sm">
        <Link href="/my-blogs/create"><Plus className="size-4" />New Blog</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/playlists/create"><ListMusic className="size-4" />New Playlist</Link>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/blogs/${user?.email}`}><Eye className="size-4" />Public View</Link>
      </Button>
    </>
  );

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProfileHeader profile={userProfile} loading={profileLoading} actions={profileActions} />

        {/* Search & Filters */}
        <div className="mb-5 flex flex-col gap-3">
          <SearchBar
            id="my-blogs-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSubmit={() => { setCurrentPage(1); setSubmittedSearch(searchQuery.trim()); }}
            placeholder="Search blogs..."
            buttonLabel="Search"
            disabled={blogsLoading}
          />
          <CategoryPills categories={categories} selectedCategory={selectedCategory} onSelect={(cat) => { setSelectedCategory(cat); setCurrentPage(1); }} />
        </div>

        {/* Blog Table */}
        {blogsLoading && blogs.length === 0 ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden p-5">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                </div>
              ))}
            </div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed border-border">
            <p className="text-lg font-semibold text-foreground mb-2">
              {submittedSearch || selectedCategory !== "All" ? "No results found" : "No blogs yet"}
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              {submittedSearch || selectedCategory !== "All"
                ? "No blogs matched your filters."
                : "Start writing your first blog!"}
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild size="sm">
                <Link href="/my-blogs/create"><Plus className="size-4" />New Blog</Link>
              </Button>
              {(submittedSearch || selectedCategory !== "All") && (
                <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setSubmittedSearch(""); setSelectedCategory("All"); setCurrentPage(1); }}>
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className={cn("bg-card border border-border rounded-lg overflow-hidden shadow-sm transition-opacity", isFetchingBlogs ? "opacity-60" : "opacity-100")}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                      {user?.role === 'Admin' && <th className="px-4 py-3 text-left font-medium text-muted-foreground">Author</th>}
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Views</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Likes</th>
                      {user?.role === 'Admin' && <th className="px-4 py-3 text-center font-medium text-muted-foreground">Featured</th>}
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {blogs.map((blog, index) => {
                      const blogAuthor = blog.author?.email || blog.author_email || blog.authorUsername;
                      const blogHref = blogAuthor ? `/blogs/${blogAuthor}/${blog.slug}` : `/blogs/${blog.slug}`;
                      return (
                        <tr key={blog.id || blog.slug || `blog-${index}`} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <Link href={blogHref} className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 max-w-52">
                              {blog.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                              {blog.category_name || (typeof blog.category === 'string' ? blog.category : blog.category?.name) || 'General'}
                            </span>
                          </td>
                          {user?.role === 'Admin' && (
                            <td className="px-4 py-3.5 text-muted-foreground text-sm">
                              {blog.author?.full_name || blog.authorFullName || '—'}
                            </td>
                          )}
                          <td className="px-4 py-3.5 text-muted-foreground text-sm whitespace-nowrap">
                            {formatDate(getBlogDate(blog), "Date")}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                              <Eye className="size-3.5" />
                              <span className="text-sm">{blog.views !== undefined ? blog.views.toLocaleString() : '0'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                              <Heart className="size-3.5" />
                              <span className="text-sm">{blog.likes !== undefined ? blog.likes.toLocaleString() : '0'}</span>
                            </div>
                          </td>
                          {user?.role === 'Admin' && (
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => handleToggleFeatured(blog.id, blog.featured)}
                                className={cn(
                                  "flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mx-auto transition-colors",
                                  blog.featured ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                              >
                                <Star className={cn("size-3", blog.featured ? "fill-current" : "")} />
                                {blog.featured ? "Featured" : "Feature"}
                              </button>
                            </td>
                          )}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3 text-sm">
                              <Link href={`/my-blogs/edit/${blog.slug}`} className="text-primary hover:underline underline-offset-2">Edit</Link>
                              <Link href={blogHref} className="text-muted-foreground hover:text-foreground transition-colors">View</Link>
                              <button onClick={() => handleDeleteBlog(blog.slug || blog.id, blog.title)} disabled={deletingBlogId === (blog.slug || blog.id)} className="text-destructive hover:underline underline-offset-2 disabled:opacity-50">
                                {deletingBlogId === (blog.slug || blog.id) ? '…' : 'Delete'}
                              </button>
                              {linkedinSharedPosts.includes(blog.slug) ? (
                                <span className="flex items-center gap-1 text-[#0A66C2] text-xs">
                                  <LinkedInIcon className="size-3" />Shared
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleShareToLinkedIn(blog)}
                                  disabled={sharingToLinkedIn === blog.slug || !linkedinLinked}
                                  className="flex items-center gap-1 text-[#0A66C2] text-xs hover:underline underline-offset-2 disabled:opacity-40"
                                >
                                  <LinkedInIcon className="size-3" />
                                  {sharingToLinkedIn === blog.slug ? '…' : 'Share'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mb-12">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isFetchingBlogs} />
            </div>
          </>
        )}

        {/* Playlists Section */}
        <div className="mb-12 pt-10">
          <Separator className="mb-8" />
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ListMusic className="size-5 text-primary" />
              My Playlists
            </h2>
          </div>

          {!playlistsLoading && playlists.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground text-sm mb-4">No playlists yet.</p>
              <Button asChild size="sm">
                <Link href="/playlists/create"><Plus className="size-4" />Create Playlist</Link>
              </Button>
            </div>
          ) : playlistsLoading ? (
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Playlist</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visibility</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Blogs</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Views</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Likes</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {playlists.map((playlist) => (
                      <tr key={playlist.id || playlist.slug} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <Link href={`/playlists/${user?.email}/${playlist.slug}`} className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
                            <ListMusic className="size-4 text-muted-foreground" />
                            <span className="truncate max-w-48">{playlist.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", playlist.is_public ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>
                            {playlist.is_public ? 'Public' : 'Private'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-muted-foreground">{playlist.blog_count || 0}</td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Eye className="size-3.5" /><span>{(playlist.total_views || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Heart className="size-3.5" /><span>{(playlist.total_likes || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3 text-sm">
                            <Link href={`/playlists/${user?.email}/${playlist.slug}`} className="text-muted-foreground hover:text-foreground transition-colors">View</Link>
                            <Link href={`/playlists/edit/${playlist.slug}`} className="text-primary hover:underline underline-offset-2">Edit</Link>
                            <button onClick={() => handleDeletePlaylist(playlist.slug, playlist.name)} disabled={deletingPlaylistId === playlist.slug} className="text-destructive hover:underline underline-offset-2 disabled:opacity-50">
                              {deletingPlaylistId === playlist.slug ? '…' : 'Delete'}
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

          <Pagination currentPage={playlistPage} totalPages={playlistTotalPages} onPageChange={setPlaylistPage} disabled={playlistsLoading} />
        </div>
      </div>
    </div>
  );
}
