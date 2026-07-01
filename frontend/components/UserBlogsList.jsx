"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const BLOGS_PER_PAGE = 9;

export default function UserBlogsList({ username }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, token } = useAuth();

    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const initialSearch = searchParams.get("search") || "";
    const initialCategory = searchParams.get("category") || "All";

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [currentPage, setCurrentPage] = useState(initialPage);

    const isOwner = user?.email === username;

    const updateUrl = useCallback((page, search, category) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search && search.trim() !== "") params.set("search", search.trim());
        if (category && category !== "All") params.set("category", category);
        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router]);

    const { data: userProfile, isLoading: profileLoading } = useQuery({
        queryKey: ["userProfile", username],
        queryFn: async () => await api.getUserProfileByEmail(username),
        enabled: !!username,
        staleTime: 1000 * 60 * 5,
    });

    const { data: categoriesData } = useQuery({
        queryKey: ["categories", username],
        queryFn: async () => {
            const response = await api.getBlogCategories(username);
            return response.results || response.categories || [];
        },
        enabled: !!username,
        staleTime: 1000 * 60 * 5,
    });
    
    const categories = ["All", ...(categoriesData ? categoriesData.map(c => typeof c === 'string' ? c : c.name) : [])];

    const authorId = userProfile?.id || userProfile?._id;

    const { data: playlistsData } = useQuery({
        queryKey: ["playlists", username, authorId, isOwner, token],
        queryFn: async () => {
            const response = await api.getUserPlaylistsByEmail(username, authorId, token, isOwner);
            return response.playlists || [];
        },
        enabled: !!username && !!authorId,
        staleTime: 1000 * 60 * 5,
    });

    const playlists = playlistsData || [];

    const skip = (currentPage - 1) * BLOGS_PER_PAGE;
    const search = submittedSearch && submittedSearch.trim().length >= 3 ? submittedSearch.trim() : null;
    const filter = selectedCategory === "All" ? null : selectedCategory;

    const { data: blogsData, isLoading: blogsLoading, isFetching: isFetchingBlogs } = useQuery({
        queryKey: ["blogs", username, authorId, search, skip, filter],
        queryFn: async () => {
            return await api.getBlogs(search, skip, BLOGS_PER_PAGE, filter, authorId);
        },
        enabled: !!userProfile,
        staleTime: 1000 * 60 * 5,
    });

    const allBlogs = blogsData?.blogs || [];
    const totalBlogs = blogsData?.total || 0;

    useEffect(() => {
        updateUrl(currentPage, submittedSearch, selectedCategory);
    }, [currentPage, submittedSearch, selectedCategory, updateUrl]);

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

    if (!userProfile && profileLoading) {
        return (
            <div className="py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center min-h-52">
                        <LoaderCard message="Loading profile..." />
                    </div>
                </div>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="py-12 text-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-muted/30 rounded-lg border border-dashed border-border p-12">
                        <p className="text-muted-foreground">User not found</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                <ProfileHeader
                    profile={userProfile}
                    loading={profileLoading}
                    categories={categories}
                />

                {/* Playlists */}
                {(playlists.length > 0 || isOwner) && (
                    <div className="mb-12">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                            <ListMusic className="size-5 text-primary" />
                            Playlists
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playlists.map((playlist) => {
                                const coverSrc = getImageUrl(
                                    typeof (playlist.cover_image || playlist.thumbnail) === 'string'
                                        ? (playlist.cover_image || playlist.thumbnail)
                                        : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path || null)
                                );
                                return (
                                    <Link
                                        key={playlist.id}
                                        href={`/playlists/${username}/${playlist.slug}`}
                                        className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all flex flex-col"
                                    >
                                        <div className="relative aspect-video bg-muted overflow-hidden">
                                            {coverSrc ? (
                                                <Image
                                                    src={coverSrc}
                                                    alt={playlist.name}
                                                    fill
                                                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                                    <ListMusic className="size-8 opacity-30" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col">
                                            <h3 className="font-semibold text-base text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                                                {playlist.name}
                                            </h3>
                                            {playlist.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed flex-1">
                                                    {playlist.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="size-3.5" />
                                                    {playlist.blog_count || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Eye className="size-3.5" />
                                                    {(playlist.total_views || 0).toLocaleString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Heart className="size-3.5" />
                                                    {(playlist.total_likes || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                        <Separator className="mt-12" />
                    </div>
                )}

                {/* Blogs Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-foreground mb-6">Blogs</h2>
                    <div className="mb-5">
                        <SearchBar
                            id="user-blogs-search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onSubmit={handleSearch}
                            placeholder="Search blogs..."
                            buttonLabel="Search"
                            disabled={isFetchingBlogs}
                        />
                    </div>
                    <div className="mb-5 flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                            {totalBlogs} blog{totalBlogs !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <CategoryPills
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelect={(cat) => { setSelectedCategory(cat); setCurrentPage(1); }}
                    />
                </div>

                {transformedBlogs.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                            {transformedBlogs.map((blog) => (
                                <BlogCard key={blog.slug} blog={blog} />
                            ))}
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            disabled={isFetchingBlogs}
                        />
                    </>
                ) : blogsLoading || isFetchingBlogs ? (
                    <div className="flex items-center justify-center py-20">
                        <LoaderCard message="Loading blogs..." />
                    </div>
                ) : (
                    <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed border-border">
                        <p className="text-lg font-semibold text-foreground mb-2">
                            {searchQuery.length >= 3 ? "No results found" : "No blogs yet"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {searchQuery.length >= 3
                                ? "No blogs match your search."
                                : "No blogs have been published yet."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
