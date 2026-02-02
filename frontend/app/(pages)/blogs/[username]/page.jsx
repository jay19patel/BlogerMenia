"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import BlogCard from "@/components/BlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import { Search, ChevronLeft, ChevronRight, Calendar, Eye, Heart, FileText, User as UserIcon, Mail, Globe, BookOpen, FolderOpen, ListMusic } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import LoaderCard from "@/components/ui/loader";

const BLOGS_PER_PAGE = 9;

export default function UserBlogsPage() {
  const { username } = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [allBlogs, setAllBlogs] = useState([]);
  const [initialBlogsLoading, setInitialBlogsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [categories, setCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setProfileLoading(true);
        const profile = await api.getUserProfileByUsername(username);
        if (!profile) {
          toast.error("User not found");
          router.push("/blogs");
          return;
        }
        
        if (profile.username && username !== profile.username) {
          router.replace(`/blogs/${profile.username}`);
          return;
        }
        
        setUserProfile(profile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("User not found");
        router.push("/blogs");
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, router]);

  useEffect(() => {
    if (!initialBlogsLoading) {
      setListLoading(true);
    }
    const fetchBlogs = async () => {
      try {
        if (!username) {
          setAllBlogs([]);
          setTotalBlogs(0);
          return;
        }
        
        setListLoading(true);
        const skip = (currentPage - 1) * BLOGS_PER_PAGE;
        const search = searchQuery.length >= 3 ? searchQuery : null;
        const filter = selectedCategory !== 'All' ? selectedCategory : null;
        
        if (!username) {
          setAllBlogs([]);
          setTotalBlogs(0);
          return;
        }
        
        const response = await api.getBlogs(
          search,
          skip,
          BLOGS_PER_PAGE,
          filter,
          username
        );
        
        const blogs = response.blogs || [];
        const transformed = blogs.map(blog => ({
          slug: blog.slug,
          title: blog.title,
          description: blog.excerpt,
          image: blog.image,
          category: blog.category,
          date: new Date(blog.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          featured: blog.featured || false,
          publishedDate: blog.publishedDate,
          authorUsername: username,
        }));

        setAllBlogs(transformed);
        setTotalBlogs(response.total || 0);
      } catch (error) {
        console.error("Error fetching blogs:", error);
        toast.error("Failed to load blogs");
        setAllBlogs([]);
        setTotalBlogs(0);
      } finally {
        setListLoading(false);
        setInitialBlogsLoading(false);
      }
    };
    
    const timer = setTimeout(() => {
      fetchBlogs();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, username, selectedCategory]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!username) return;
      try {
        const resp = await api.getBlogCategories(username);
        const cats = resp.categories || [];
        setCategories(["All", ...cats]);
      } catch (e) {
        console.error("Error loading categories:", e);
        setCategories(["All"]);
      }
    };
    loadCategories();
  }, [username]);

  useEffect(() => {
    const loadPlaylists = async () => {
      if (!username) return;
      try {
        setPlaylistsLoading(true);
        const response = await api.getUserPlaylistsByUsername(username);
        setPlaylists(response.playlists || []);
      } catch (e) {
        console.error('Error loading playlists:', e);
        setPlaylists([]);
      } finally {
        setPlaylistsLoading(false);
      }
    };
    loadPlaylists();
  }, [username]);

  const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Blogs", href: "/blogs" },
    { label: userProfile?.username || "User", href: null },
  ];

  if (profileLoading || initialBlogsLoading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-40 sm:h-48 lg:h-56">
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderCard message="Loading…" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mb-12 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="w-full h-32 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600"></div>
          
          <div className="px-8 py-6">
            <div className="flex items-center justify-center sm:justify-start mb-4 -mt-16">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-white rounded-full overflow-hidden shadow-lg">
                  {userProfile.profile_image ? (
                    <Image
                      src={userProfile.profile_image}
                      alt={userProfile.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600">
                      <UserIcon className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center flex-col sm:flex-row max-sm:gap-4 sm:justify-between mb-6">
              <div className="block">
                <h3 className="font-bold text-3xl text-gray-900 mb-1 max-sm:text-center">
                  {userProfile.full_name || userProfile.username}
                </h3>
                <p className="font-normal text-base leading-6 text-gray-500 max-sm:text-center">
                  @{userProfile.username}
                  {userProfile.headline && <span> • {userProfile.headline}</span>}
                </p>
                {userProfile.description && (
                  <p className="font-normal text-sm leading-5 text-gray-600 mt-2 max-sm:text-center">
                    {userProfile.description}
                  </p>
                )}
              </div>
              
              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {categories.map((category, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold transition-all duration-300 hover:bg-indigo-100 hover:text-indigo-700"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col flex-1 gap-6 lg:gap-0 lg:flex-row lg:justify-between">
              <div className="w-full lg:w-1/4 border-b pb-6 lg:border-b-0 lg:pb-0 lg:border-r border-gray-100">
                <div className="font-bold text-3xl text-gray-900 mb-2 text-center">
                  {userProfile.blog_count || 0}
                </div>
                <span className="text-sm text-gray-500 text-center block">Blogs Published</span>
              </div>
              
              <div className="w-full lg:w-1/4 border-b pb-6 lg:border-b-0 lg:pb-0 lg:border-r border-gray-100">
                <div className="font-bold text-3xl text-gray-900 mb-2 text-center">
                  {userProfile.total_views?.toLocaleString() || 0}
                </div>
                <span className="text-sm text-gray-500 text-center block">Total Views</span>
              </div>
              
              <div className="w-full lg:w-1/4 border-b pb-6 lg:border-b-0 lg:pb-0 lg:border-r border-gray-100">
                <div className="font-bold text-3xl text-gray-900 mb-2 text-center">
                  {userProfile.total_likes?.toLocaleString() || 0}
                </div>
                <span className="text-sm text-gray-500 text-center block">Total Likes</span>
              </div>
              
              <div className="w-full lg:w-1/4">
                <div className="font-bold text-3xl text-gray-900 mb-2 text-center">
                  {new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                <span className="text-sm text-gray-500 text-center block">Member Since</span>
              </div>
            </div>
          </div>
        </div>

        {playlists.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ListMusic className="w-7 h-7 text-indigo-600" />
              All Playlists
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlists.map((playlist, index) => (
                <Link
                  key={playlist.id}
                  href={`/playlists/${username}/${playlist.slug}`}
                  className="group relative block"
                  style={{ zIndex: playlists.length - index }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gray-50 border border-gray-400 rounded-lg transform translate-x-3 translate-y-3 opacity-40 shadow-md"></div>
                    <div className="absolute inset-0 bg-gray-50 border border-gray-400 rounded-lg transform translate-x-2 translate-y-2 opacity-60 shadow-md"></div>
                    <div className="absolute inset-0 bg-gray-50 border border-gray-400 rounded-lg transform translate-x-1 translate-y-1 opacity-80 shadow-md transition-all duration-300"></div>
                    
                    <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm group-hover:shadow-lg group-hover:border-indigo-300 group-hover:scale-105 transition-all duration-300">
                      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600">
                        {playlist.cover_image ? (
                          <img
                            src={playlist.cover_image}
                            alt={playlist.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-16 h-16 text-white opacity-50" />
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {playlist.name}
                        </h3>

                        {playlist.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {playlist.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {playlist.blog_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {(playlist.total_views || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {(playlist.total_likes || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">All Articles</h2>
          
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search articles... (type at least 3 characters)"
                value={searchInput}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searchInput.length < 3 && searchInput.length > 0}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 whitespace-nowrap"
            >
              <Search className="w-5 h-5 inline-block mr-2" />
              Search
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-600">
              Showing {allBlogs.length} article{allBlogs.length !== 1 ? "s" : ""}
              {totalBlogs > 0 && ` of ${totalBlogs} total`}
            </p>
          </div>
        <div className="mb-8 flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => { setSelectedCategory(category); setCurrentPage(1); }}
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

        {allBlogs.length > 0 ? (
          <>
            <div className="relative mb-12">
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${listLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                {allBlogs.map((blog) => (
                  <BlogCard key={blog.slug} blog={blog} />
                ))}
              </div>
              {listLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoaderCard message="Updating results…" />
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
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
                    if (totalPages > 7 && page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 2) {
                      return page === 2 || page === totalPages - 1 ? (
                        <span key={page} className="px-2 text-gray-500">...</span>
                      ) : null;
                    }
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
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-gray-600 mb-4">
              {searchQuery.length >= 3 
                ? "No articles found"
                : "No articles yet"}
            </p>
            <p className="text-gray-500">
              {searchQuery.length >= 3 
                ? "Try adjusting your search to find what you're looking for."
                : "This user hasn't published any articles yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

