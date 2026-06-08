"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import BlogCard from "@/components/BlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import ProfileHeader from "@/components/ProfileHeader";
import SearchBar from "@/components/ui/search-bar";
import CategoryPills from "@/components/ui/category-pills";
import Pagination from "@/components/ui/pagination";
import { BookOpen, Eye, Heart, ListMusic } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import LoaderCard from "@/components/ui/loader";
import { useAuth } from "@/contexts/AuthContext";
import { getBlogDate, formatDate, getImageUrl } from "@/lib/utils";

const BLOGS_PER_PAGE = 9;

export default function UserBlogsList({ username }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, token } = useAuth();

    // Read initial states from URL
    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const initialSearch = searchParams.get("search") || "";
    const initialCategory = searchParams.get("category") || "All";

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [currentPage, setCurrentPage] = useState(initialPage);

    const isOwner = user?.email === username;

    // Data States
    const [userProfile, setUserProfile] = useState(null);
    const [categories, setCategories] = useState(["All"]);
    const [playlists, setPlaylists] = useState([]);
    const [allBlogs, setAllBlogs] = useState([]);
    const [totalBlogs, setTotalBlogs] = useState(0);

    // Loading States
    const [profileLoading, setProfileLoading] = useState(true);
    const [blogsLoading, setBlogsLoading] = useState(true);
    const [isFetchingBlogs, setIsFetchingBlogs] = useState(false);

    // Sync URL — use replace so filter changes don't stack history entries
    const updateUrl = useCallback((page, search, category) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search && search.trim() !== "") params.set("search", search.trim());
        if (category && category !== "All") params.set("category", category);

        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router]);

    // 1. Fetch User Profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await api.getUserProfileByEmail(username);
                setUserProfile(profile);
            } catch (error) {
                console.error("Error fetching User profile:", error);
            } finally {
                setProfileLoading(false);
            }
        };
        if (username) fetchProfile();
    }, [username]);

    // 2. Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.getBlogCategories(username);
                const categoriesList = response.results || response.categories || [];
                setCategories(["All", ...categoriesList.map(c => typeof c === 'string' ? c : c.name)]);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        if (username) fetchCategories();
    }, [username]);

    // 3. Fetch Playlists
    const fetchPlaylists = useCallback(async () => {
        if (!username || !userProfile) return;
        try {
            const authorId = userProfile.id || userProfile._id;
            const response = await api.getUserPlaylistsByEmail(username, authorId, token, isOwner);
            setPlaylists(response.playlists || []);
        } catch (error) {
            console.error("Error fetching User playlists:", error);
        }
    }, [username, token, userProfile, isOwner]);

    useEffect(() => {
        fetchPlaylists();
    }, [fetchPlaylists]);

    // 4. Fetch Blogs
    useEffect(() => {
        const fetchBlogs = async () => {
            if (!userProfile) return;
            setIsFetchingBlogs(true);
            try {
                const skip = (currentPage - 1) * BLOGS_PER_PAGE;
                const search = submittedSearch && submittedSearch.trim().length >= 3 ? submittedSearch.trim() : null;
                const filter = selectedCategory === "All" ? null : selectedCategory;

                const authorId = userProfile.id || userProfile._id;
                const response = await api.getBlogs(search, skip, BLOGS_PER_PAGE, filter, authorId);
                setAllBlogs(response.blogs || []);
                setTotalBlogs(response.total || 0);
            } catch (error) {
                console.error("Error fetching blogs:", error);
            } finally {
                setBlogsLoading(false);
                setIsFetchingBlogs(false);
            }
        };

        if (userProfile) fetchBlogs();
        updateUrl(currentPage, submittedSearch, selectedCategory);
    }, [currentPage, submittedSearch, selectedCategory, updateUrl, userProfile]);

    // Transform logic
    const transformedBlogs = allBlogs.map((blog) => ({
        slug: blog.slug,
        title: blog.title,
        description: blog.excerpt,
        image: blog.thumbnail?.file_path || blog.thumbnail || blog.image,
        category: blog.category_name || (typeof blog.category === 'string' ? blog.category : blog.category?.name),
        date: formatDate(getBlogDate(blog), "Date"),
        featured: blog.featured || false,
        publishedDate: getBlogDate(blog),
        authorUsername: username,
        authorEmail: username,
        views: blog.views,
        likes: blog.likes
    }));

    // Handlers
    const handleSearch = () => {
        setCurrentPage(1);
        setSubmittedSearch(searchQuery.trim());
    };

    const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Blogs", href: "/blogs" },
        { label: userProfile?.full_name || username || "User", href: null },
    ];

    // Full loading state — only if we have NO profile yet
    if (!userProfile && profileLoading) {
        return (
            <div className="py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative h-40 sm:h-48 lg:h-56">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoaderCard message="Loading profile..." />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="py-12 text-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="border-2 border-foreground p-12 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                        <p className="font-mono font-bold uppercase tracking-widest text-foreground">
                            User not found
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                {/* Shared Profile Header */}
                <ProfileHeader
                    profile={userProfile}
                    loading={profileLoading}
                    categories={categories}
                />

                {/* Playlists */}
                {(playlists.length > 0 || isOwner) && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground uppercase tracking-tighter flex items-center gap-2">
                                <ListMusic className="w-7 h-7" />
                                All Playlists
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {playlists.map((playlist, index) => (
                                <Link
                                    key={playlist.id}
                                    href={`/playlists/${username}/${playlist.slug}`}
                                    className="group relative block h-full"
                                    style={{ zIndex: playlists.length - index }}
                                >
                                    <div className="relative h-full">
                                        <div className="absolute inset-0 bg-foreground transform translate-x-2 translate-y-2 opacity-100 transition-all duration-300"></div>

                                        <div className="relative h-full flex flex-col bg-background border-2 border-foreground overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300">
                                            <div className="relative aspect-video overflow-hidden bg-zinc-100 border-b-2 border-foreground">
                                                {(typeof (playlist.cover_image || playlist.thumbnail) === 'string'
                                                    ? (playlist.cover_image || playlist.thumbnail)
                                                    : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path)) ? (
                                                    <Image
                                                        src={getImageUrl(
                                                            typeof (playlist.cover_image || playlist.thumbnail) === 'string'
                                                                ? (playlist.cover_image || playlist.thumbnail)
                                                                : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path)
                                                        )}
                                                        alt={playlist.name}
                                                        fill
                                                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                                        className="object-cover opacity-90 group-hover:opacity-100 transition-all duration-500"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-foreground text-background">
                                                        <p className="font-mono font-bold uppercase tracking-widest text-xl opacity-50">SYS.NO_IMG</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className="font-extrabold text-xl text-foreground mb-2 line-clamp-2 uppercase tracking-tight group-hover:text-purple-900 transition-colors">
                                                    {playlist.name}
                                                </h3>

                                                {playlist.description && (
                                                    <p className="text-xs font-mono text-gray-700 line-clamp-3 mb-4 leading-relaxed flex-1">
                                                        {playlist.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-widest text-foreground mt-auto pt-4 border-t-2 border-foreground group-hover:border-purple-900 transition-colors">
                                                    <span className="flex items-center gap-1.5 group-hover:text-purple-900">
                                                        <BookOpen className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                        {playlist.blog_count || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 group-hover:text-purple-900">
                                                        <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                        {(playlist.total_views || 0).toLocaleString()}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 group-hover:text-purple-900">
                                                        <Heart className="w-3.5 h-3.5" strokeWidth={2.5} />
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

                {/* Blogs Section */}
                <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-6 uppercase tracking-tight">
                        SYSTEM.RECORDS
                    </h2>

                    <div className="mb-6">
                        <SearchBar
                            id="user-blogs-search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onSubmit={handleSearch}
                            placeholder="QUERY RECORDS... (MIN 3 CHARS)"
                            buttonLabel="Execute"
                            disabled={isFetchingBlogs}
                        />
                    </div>

                    <div className="mb-6">
                        <p className="text-foreground font-mono text-xs font-bold uppercase tracking-widest mb-4">
                            Found {transformedBlogs.length} record{transformedBlogs.length !== 1 ? "s" : ""}
                            {totalBlogs > 0 && ` / ${totalBlogs} TOTAL`}
                        </p>
                        <CategoryPills
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onSelect={(cat) => {
                                setSelectedCategory(cat);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                {transformedBlogs.length > 0 ? (
                    <>
                        <div className="relative mb-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {transformedBlogs.map((blog) => (
                                    <BlogCard key={blog.slug} blog={blog} />
                                ))}
                            </div>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            disabled={isFetchingBlogs}
                        />
                    </>
                ) : blogsLoading || isFetchingBlogs ? (
                    <div className="relative py-12">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoaderCard message="Loading articles..." />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] mt-8">
                        <h3 className="text-2xl font-extrabold text-foreground mb-2 uppercase tracking-tight">
                            {searchQuery.length >= 3 ? "SYSTEM.NOT_FOUND" : "SYSTEM.EMPTY"}
                        </h3>
                        <p className="text-gray-600 font-mono text-sm">
                            {searchQuery.length >= 3
                                ? "No records match your query."
                                : "No records found in this collection."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
