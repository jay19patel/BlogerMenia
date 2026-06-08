"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

    const [allPlaylists, setAllPlaylists] = useState([]);
    const [totalPlaylists, setTotalPlaylists] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);

    // router.replace so filter changes don't pollute Back button history
    const updateUrl = useCallback((page, search) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search && search.trim() !== "") params.set("search", search.trim());
        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router]);

    useEffect(() => {
        const fetchPlaylists = async () => {
            setIsFetching(true);
            try {
                const skip = (currentPage - 1) * PLAYLISTS_PER_PAGE;
                const search = submittedSearch && submittedSearch.trim().length > 0 ? submittedSearch.trim() : null;
                const response = await api.getPlaylists(search, skip, PLAYLISTS_PER_PAGE);
                setAllPlaylists(response.results || response.playlists || []);
                setTotalPlaylists(response.total || 0);
            } catch (error) {
                console.error("Error fetching playlists:", error);
            } finally {
                setIsLoading(false);
                setIsFetching(false);
            }
        };

        fetchPlaylists();
        updateUrl(currentPage, submittedSearch);
    }, [currentPage, submittedSearch, updateUrl]);

    const handleSearch = () => {
        setCurrentPage(1);
        setSubmittedSearch(searchQuery.trim());
    };

    const totalPages = Math.ceil(totalPlaylists / PLAYLISTS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Tracks", href: null },
    ];

    if (isLoading) {
        return (
            <div className="py-12 border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative h-40 sm:h-48 lg:h-56">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoaderCard message="Fetching tracks…" />
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
                <div className="mb-12 border-b-2 border-foreground pb-8 mt-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 uppercase tracking-tight">
                        Tracks
                    </h1>
                    <p className="text-lg text-gray-600 font-mono">
                        Curated sequential documentation series and inspiration from our architects.
                    </p>
                </div>

                {/* Search — shared SearchBar component */}
                <div className="mb-12 space-y-6">
                    <SearchBar
                        id="playlists-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onSubmit={handleSearch}
                        placeholder="QUERY TRACK INDEX..."
                        buttonLabel="Exec"
                        disabled={isFetching}
                    />
                </div>

                {/* Count row — identical structure to BlogsList */}
                <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
                    <p className="text-foreground font-mono text-sm uppercase tracking-widest">
                        Results: {totalPlaylists} {totalPlaylists !== 1 ? "Tracks" : "Track"} Found
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
                    /* Empty state — identical to BlogsList */
                    <div className="text-center py-16 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                        <p className="text-xl text-foreground font-mono font-bold uppercase tracking-widest mb-4">
                            No Tracks Matched Query
                        </p>
                        <p className="text-gray-500 font-mono text-sm mb-8">
                            {submittedSearch
                                ? `No tracks matching "${submittedSearch}". Try a different search.`
                                : "No public tracks found."}
                        </p>
                        {submittedSearch && (
                            <button
                                onClick={() => { setSearchQuery(""); setSubmittedSearch(""); setCurrentPage(1); }}
                                className="px-6 py-3 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:bg-purple-900 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                            >
                                Reset Search
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
            <div className="bg-background border-2 border-foreground hover:shadow-[8px_8px_0px_0px_rgba(88,28,135,1)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 flex flex-col md:flex-row h-full">

                {/* Image — same proportions as HorizontalBlogCard */}
                <div className="md:w-1/3 relative min-h-[200px] border-b-2 md:border-b-0 md:border-r-2 border-foreground bg-background flex-shrink-0 overflow-hidden">
                    {imageSrc ? (
                        <Image
                            src={imageSrc}
                            alt={playlist.name}
                            fill
                            sizes="(min-width: 768px) 33vw, 100vw"
                            className="object-cover transition-all duration-500 group-hover:scale-105"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full bg-foreground flex items-center justify-center text-background">
                            <p className="font-mono font-bold uppercase tracking-widest text-xs opacity-50">SYS.NO_IMG</p>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                    <div>
                        {/* Category tag + visibility — same style as HorizontalBlogCard date/category tags */}
                        <div className="flex items-center gap-3 mb-3">
                            <span className="bg-foreground text-background group-hover:bg-purple-900 transition-colors px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-widest">
                                TRACK
                            </span>
                            {playlist.is_public === false && (
                                <span className="border-2 border-foreground px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-widest text-foreground">
                                    PRIVATE
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl md:text-2xl font-extrabold text-foreground mb-3 line-clamp-2 group-hover:text-purple-900 transition-colors uppercase tracking-tight leading-tight">
                            {playlist.name}
                        </h3>
                        <p className="text-gray-700 font-mono text-[11px] md:text-xs line-clamp-3 leading-relaxed mb-4">
                            {playlist.description || "Explore this curated sequential documentation series."}
                        </p>
                    </div>

                    {/* Footer stats — same structure as HorizontalBlogCard */}
                    <div className="flex items-center justify-between border-t-2 border-foreground pt-4 mt-auto group-hover:border-purple-900 transition-colors">
                        {/* Author */}
                        <span className="text-[11px] font-mono font-bold uppercase text-foreground group-hover:text-purple-900 transition-colors truncate max-w-[150px]">
                            {playlist.owner?.full_name || playlist.owner?.email?.split("@")[0] || "Architect"}
                        </span>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-[10px] font-mono font-bold uppercase text-foreground group-hover:text-purple-900 transition-colors">
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" strokeWidth={2.5} />
                                <span>{playlist.blog_count || playlist.blogs?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
                                <span>{(playlist.total_views || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5" strokeWidth={2.5} />
                                <span>{(playlist.total_likes || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
