"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import BlogCard from "@/components/BlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import { Search, ChevronLeft, ChevronRight, User as UserIcon, ListMusic, BookOpen, Eye, Heart, Plus } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import LoaderCard from "@/components/ui/loader";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, getImageUrl } from "@/lib/utils";

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

    // Sync URL when state changes
    const updateUrl = useCallback((page, search, category) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search && search.trim() !== "") params.set("search", search.trim());
        if (category && category !== "All") params.set("category", category);

        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.push(newUrl, { scroll: false });
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
                // The generic API returns { results: [...] }
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
        date: formatDate(blog.publishedDate || blog.created_at),
        featured: blog.featured || false,
        publishedDate: blog.publishedDate,
        authorUsername: username, // here username is the email
        authorEmail: username,
        views: blog.views,
        likes: blog.likes
    }));

    // Handlers
    const handleSearch = () => {
        setCurrentPage(1);
        setSubmittedSearch(searchQuery.trim());
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Blogs", href: "/blogs" },
        { label: userProfile?.full_name || username || "User", href: null },
    ];

    // Loading State - Only show full loader if we have NO data yet
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
        // In hydration boundary, this shouldn't happen if prefetched correctly 
        // unless user really doesn't exist.
        // Ideally redirect or show error component.
        return (
            <div className="py-12 text-center">
                <p>User not found</p>
            </div>
        );
    }

    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                {/* Profile Header */}
                <div className="mb-12 border-2 border-foreground p-8 bg-background shadow-[8px_8px_0px_0px_#581c87]">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Side: Avatar & Name/Details */}
                        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            <div className="relative w-28 h-28 shrink-0">
                                <div className="absolute inset-0 border-2 border-foreground bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] overflow-hidden">
                                    {(typeof userProfile.profile_image === 'string' ? userProfile.profile_image : userProfile.profile_image?.file_path) ? (
                                        <Image
                                            src={getImageUrl(typeof userProfile.profile_image === 'string' ? userProfile.profile_image : userProfile.profile_image.file_path)}
                                            alt={userProfile.username || 'User'}
                                            fill
                                            className="object-cover transition-all duration-500"
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
                                {userProfile.description && (
                                    <p className="font-mono text-xs leading-relaxed text-gray-600 line-clamp-3">
                                        {userProfile.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Middle/Right: Stats & Categories in a Vertical Stack */}
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
                                    <span className="font-bold font-mono text-lg text-foreground leading-none mt-1">
                                        {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : '—'}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                                        Joined
                                    </span>
                                </div>
                            </div>

                            {/* Categories Row */}
                            {categories.filter(c => c.toLowerCase() !== 'all').length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {categories
                                        .filter(c => c.toLowerCase() !== 'all')
                                        .map((category, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-md uppercase tracking-wider"
                                            >
                                                {category}
                                            </span>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
                                                {(typeof (playlist.cover_image || playlist.thumbnail) === 'string' ? (playlist.cover_image || playlist.thumbnail) : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path)) ? (
                                                    <Image
                                                        src={getImageUrl(typeof (playlist.cover_image || playlist.thumbnail) === 'string' ? (playlist.cover_image || playlist.thumbnail) : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path))}
                                                        alt={playlist.name}
                                                        fill
                                                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                                        className="object-cover opacity-90 group-hover:opacity-100 transition-all duration-500"
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


                {/* Blogs List */}
                <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-6 uppercase tracking-tight">
                        SYSTEM.RECORDS
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Query records... (min 3 chars)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full pl-12 pr-4 py-3 bg-background border-2 border-foreground text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searchQuery.length < 3 && searchQuery.length > 0}
                            className="px-8 py-3 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs hover:bg-purple-900 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center"
                        >
                            <Search className="w-4 h-4 inline-block mr-2" />
                            Execute
                        </button>
                    </div>

                    <div className="mb-6">
                        <p className="text-foreground font-mono text-xs font-bold uppercase tracking-widest">
                            Found {transformedBlogs.length} record{transformedBlogs.length !== 1 ? "s" : ""}
                            {totalBlogs > 0 && ` / ${totalBlogs} TOTAL`}
                        </p>
                    </div>

                    <div className="mb-8 flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => {
                                    setSelectedCategory(category);
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-1.5 font-mono font-bold uppercase tracking-widest text-[10px] transition-all border-2 border-foreground ${selectedCategory === category
                                    ? "bg-foreground text-background shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]"
                                    : "bg-background text-foreground hover:bg-purple-900 hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:-translate-y-0.5 hover:-translate-x-0.5"
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {transformedBlogs.length > 0 ? (
                    <>
                        <div className="relative mb-12">
                            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}>
                                {transformedBlogs.map((blog) => (
                                    <BlogCard key={blog.slug} blog={blog} />
                                ))}
                            </div>

                            {/* Overlay removed for smoother transition */}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12">
                                <button
                                    onClick={() =>
                                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                                    }
                                    disabled={currentPage === 1 || isFetchingBlogs}
                                    className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground text-foreground font-mono font-bold uppercase tracking-widest text-[10px] hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Prev
                                </button>

                                <div className="flex items-center gap-2">
                                    {[...Array(totalPages)].map((_, index) => {
                                        const page = index + 1;
                                        if (
                                            totalPages > 7 &&
                                            page !== 1 &&
                                            page !== totalPages &&
                                            Math.abs(page - currentPage) > 2
                                        ) {
                                            return page === 2 || page === totalPages - 1 ? (
                                                <span key={page} className="px-2 text-gray-500">
                                                    ...
                                                </span>
                                            ) : null;
                                        }
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                disabled={isFetchingBlogs}
                                                className={`w-9 h-9 border-2 border-foreground font-mono font-bold text-xs transition-all ${currentPage === page
                                                    ? "bg-foreground text-background shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]"
                                                    : "bg-background text-foreground hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
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
                                    className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground text-foreground font-mono font-bold uppercase tracking-widest text-[10px] hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
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
                            {searchQuery.length >= 3
                                ? "SYSTEM.NOT_FOUND"
                                : "SYSTEM.EMPTY"}
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
