"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Eye, Heart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import LoaderCard from "@/components/ui/loader";
import Breadcrumb from "@/components/Breadcrumb";
import SearchBar from "@/components/ui/search-bar";
import Pagination from "@/components/ui/pagination";

const PLAYLISTS_PER_PAGE = 9;

export default function PlaylistsList() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const initialSearch = searchParams.get("search") || "";

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
    const [currentPage, setCurrentPage] = useState(initialPage);

    // router.replace so filter changes don't pollute Back button history
    const updateUrl = useCallback((page, search) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search && search.trim() !== "") params.set("search", search.trim());
        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router]);

    const skip = (currentPage - 1) * PLAYLISTS_PER_PAGE;
    const search = submittedSearch && submittedSearch.trim().length > 0 ? submittedSearch.trim() : null;

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["playlists", search, skip],
        queryFn: async () => {
            return await api.getPlaylists(search, skip, PLAYLISTS_PER_PAGE);
        },
        staleTime: 1000 * 60 * 5,
    });

    const allPlaylists = data?.results || data?.playlists || [];
    const totalPlaylists = data?.total || 0;

    useEffect(() => {
        updateUrl(currentPage, submittedSearch);
    }, [currentPage, submittedSearch, updateUrl]);

    const handleSearch = () => {
        setCurrentPage(1);
        setSubmittedSearch(searchQuery.trim());
    };

    const totalPages = Math.ceil(totalPlaylists / PLAYLISTS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Playlists", href: null },
    ];

    if (isLoading) {
        return (
            <div className="py-12 border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative h-40 sm:h-48 lg:h-56">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoaderCard message="Loading playlists…" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-12 border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                {/* Page Header — identical structure to BlogsList */}
                <div className="mb-10 mt-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                        Playlists
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Curated blog series to help you learn step by step.
                    </p>
                </div>

                {/* Search — shared SearchBar component */}
                <div className="mb-12 space-y-6">
                    <SearchBar
                        id="playlists-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onSubmit={handleSearch}
                        placeholder="Search playlists..."
                        buttonLabel="Search"
                        disabled={isFetching}
                    />
                </div>

                {/* Count row — identical structure to BlogsList */}
                <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
                    <p className="text-muted-foreground text-sm">
                        {totalPlaylists} {totalPlaylists !== 1 ? "playlists" : "playlist"} found
                    </p>
                </div>

                {/* Track List */}
                {allPlaylists.length > 0 ? (
                    <>
                        <div className="mx-auto">
                            <div className="space-y-6">
                                {allPlaylists.map((playlist) => (
                                    <PlaylistCard key={playlist.slug} playlist={playlist} />
                                ))}
                            </div>
                        </div>

                        {/* Shared Pagination */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            disabled={isFetching}
                        />
                    </>
                ) : (
                    <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed border-border">
                        <p className="text-lg font-semibold text-foreground mb-2">No playlists found</p>
                        <p className="text-muted-foreground text-sm mb-6">
                            {submittedSearch
                                ? `No playlists matching "${submittedSearch}". Try a different search.`
                                : "No public playlists found."}
                        </p>
                        {submittedSearch && (
                            <button
                                onClick={() => { setSearchQuery(""); setSubmittedSearch(""); setCurrentPage(1); }}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
                            >
                                Reset search
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * PlaylistCard — same layout and styling as HorizontalBlogCard.
 * Left: cover image (1/3 width, border-r-2)
 * Right: content with category tag, title, description, stats footer
 */
function PlaylistCard({ playlist }) {
    const ownerIdentifier = playlist.owner?.email || playlist.owner?.username;
    const href = `/playlists/${ownerIdentifier}/${playlist.slug}`;

    const imageSrc = getImageUrl(
        typeof (playlist.cover_image || playlist.thumbnail) === "string"
            ? (playlist.cover_image || playlist.thumbnail)
            : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path || null)
    );

    return (
        <Link href={href} className="block group h-full">
            <div className="bg-card border border-border rounded-lg flex flex-col md:flex-row h-full overflow-hidden hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">

                {/* Image */}
                <div className="md:w-2/5 relative min-h-44 bg-muted shrink-0 overflow-hidden">
                    {imageSrc ? (
                        <Image
                            src={imageSrc}
                            alt={playlist.name}
                            fill
                            sizes="(min-width: 768px) 40vw, 100vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                            <p className="text-xs">No image</p>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                                Track
                            </span>
                            {playlist.is_public === false && (
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                                    Private
                                </span>
                            )}
                        </div>

                        <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 line-clamp-2 leading-snug">
                            {playlist.name}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed mb-4">
                            {playlist.description || "Explore this curated sequential documentation series."}
                        </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                        <span className="text-sm font-medium text-foreground truncate max-w-36">
                            {playlist.owner?.full_name || playlist.owner?.email?.split("@")[0] || "Author"}
                        </span>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" strokeWidth={2} />
                                <span>{playlist.blog_count || playlist.blogs?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                                <span>{(playlist.total_views || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5" strokeWidth={2} />
                                <span>{(playlist.total_likes || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
