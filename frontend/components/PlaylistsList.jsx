"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, PlayCircle, ListMusic } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import LoaderCard from "@/components/ui/loader";
import Breadcrumb from "@/components/Breadcrumb";

const PLAYLISTS_PER_PAGE = 8;

export default function PlaylistsList() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Read initial states from URL
    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const initialSearch = searchParams.get("search") || "";

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
    const [currentPage, setCurrentPage] = useState(initialPage);

    // Data States
    const [allPlaylists, setAllPlaylists] = useState([]);
    const [totalPlaylists, setTotalPlaylists] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);

    // Sync URL when state changes
    const updateUrl = useCallback((page, search) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search && search.trim() !== "") params.set("search", search.trim());

        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.push(newUrl, { scroll: false });
    }, [pathname, router]);

    // Fetch Playlists
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

    const totalPages = Math.ceil(totalPlaylists / PLAYLISTS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Playlists", href: null },
    ];

    if (isLoading) {
        return (
            <div className="py-24 flex justify-center items-center min-h-[400px]">
                <LoaderCard message="Loading tracks…" />
            </div>
        );
    }

    return (
        <div className="py-12 bg-gray-50/50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                <div className="mb-10 border-b-2 border-foreground pb-6 mt-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-foreground uppercase tracking-tight mb-4">
                        Tracks
                    </h1>
                    <p className="text-lg font-mono text-gray-600 max-w-2xl">
                        Curated sequential documentation series and inspiration from our architects.
                    </p>
                </div>

                {/* Search */}
                <div className="mb-12 relative flex border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(88,28,135,1)]">
                    <input
                        type="text"
                        placeholder="query track index..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyPress}
                        className="w-full pl-6 pr-6 py-4 bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all font-mono text-foreground"
                    />
                    <button
                        onClick={handleSearch}
                        className="right-0 top-0 bottom-0 px-8 bg-foreground text-background font-bold uppercase tracking-widest hover:bg-gray-800 transition-all border-l-2 border-foreground flex items-center justify-center font-mono"
                    >
                        Exec
                    </button>
                </div>

                <div className="mb-8 flex items-center justify-between border-b-2 border-gray-200 pb-4">
                    <p className="text-gray-600 font-bold font-mono uppercase tracking-widest text-sm">
                        Showing {allPlaylists.length} of {totalPlaylists} Track{totalPlaylists !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* Playlists List */}
                {allPlaylists.length > 0 ? (
                    <>
                        <div className="space-y-6">
                            {allPlaylists.map((playlist) => (
                                <Link
                                    key={playlist.slug}
                                    href={`/playlists/${playlist.owner?.email || playlist.owner?.username}/${playlist.slug}`}
                                    className="group block bg-background border-2 border-foreground overflow-hidden hover:shadow-[8px_8px_0px_0px_rgba(88,28,135,1)] transition-all duration-300 relative md:h-48"
                                >
                                    <div className="flex flex-col md:flex-row h-full">
                                        {/* Image Box */}
                                        <div className="md:w-1/3 relative overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-foreground bg-gray-100 flex items-center justify-center shrink-0">
                                            {playlist.thumbnail ? (
                                                <img
                                                    src={getImageUrl(playlist.thumbnail?.file_path || playlist.thumbnail)}
                                                    alt={playlist.name}
                                                    className="w-full h-full object-cover transition-all duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-foreground flex items-center justify-center p-4 text-center text-background font-mono font-bold text-sm">
                                                    {playlist.name}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Box */}
                                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center min-w-0 bg-background">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono px-2 py-0.5 border border-indigo-200">TRACK</span>
                                            </div>
                                            <div className="mb-4">
                                                <h3 className="text-2xl font-extrabold text-foreground group-hover:text-indigo-600 transition-colors uppercase tracking-tight mb-2 line-clamp-1">
                                                    {playlist.name}
                                                </h3>
                                                <p className="text-sm font-mono text-gray-600 line-clamp-2 leading-relaxed max-w-2xl">
                                                    {playlist.description || "Explore this curated sequential documentation."}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-8 mt-auto border-t border-gray-200 pt-4">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-bold text-foreground font-mono leading-none">{playlist.blogs?.length || 0}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Articles</span>
                                                </div>
                                                <div className="h-8 w-px bg-gray-200"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-base font-bold text-foreground font-mono leading-none">{(playlist.total_views || 0).toLocaleString()}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Views</span>
                                                </div>
                                                <div className="h-8 w-px bg-gray-200"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Architect</span>
                                                    <span className="text-sm font-bold text-indigo-600 truncate max-w-[150px] uppercase font-mono">
                                                        {playlist.owner?.full_name || playlist.owner?.email?.split('@')[0]}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-16 pb-8 font-mono">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1 || isFetching}
                                    className="p-3 bg-background border-2 border-foreground text-foreground hover:bg-foreground hover:text-background disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-2">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const p = i + 1;
                                        if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                                            if (Math.abs(p - currentPage) === 3) return <span key={p} className="text-gray-400 font-bold tracking-widest">...</span>;
                                            return null;
                                        }
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-12 h-12 font-bold transition-all border-2 border-foreground ${currentPage === p
                                                    ? "bg-foreground text-background shadow-[4px_4px_0px_0px_rgba(88,28,135,1)]"
                                                    : "bg-background text-foreground hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || isFetching}
                                    className="p-3 bg-background border-2 border-foreground text-foreground hover:bg-foreground hover:text-background disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-24 bg-background border-2 border-dashed border-foreground shadow-[8px_8px_0px_0px_rgba(200,200,200,1)]">
                        <p className="text-2xl font-extrabold text-foreground mb-4 uppercase tracking-tight">No tracks found</p>
                        <p className="text-gray-600 font-mono">
                            We couldn't find any public tracks matching "{submittedSearch}".
                        </p>
                        <button
                            onClick={() => { setSearchQuery(""); setSubmittedSearch(""); setCurrentPage(1); }}
                            className="mt-8 px-6 py-3 bg-foreground text-background font-bold uppercase font-mono hover:bg-gray-800 transition-colors"
                        >
                            Reset Search
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
