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
            <div className="py-12 flex justify-center items-center min-h-[400px]">
                <LoaderCard message="Loading playlists…" />
            </div>
        );
    }

    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                        Public Playlists
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl">
                        Curated collections of great reads, learning paths, and inspiration from our community.
                    </p>
                </div>

                {/* Search */}
                <div className="mb-12 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search playlists by name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyPress}
                        className="w-full pl-12 pr-32 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
                    />
                    <button
                        onClick={handleSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold"
                    >
                        Search
                    </button>
                </div>

                <div className="mb-8 flex items-center justify-between">
                    <p className="text-gray-600 font-medium font-inter">
                        Showing {allPlaylists.length} of {totalPlaylists} playlist
                        {totalPlaylists !== 1 ? "s" : ""}
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
                                    className="group block bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-indigo-500 shadow-sm relative md:h-40"
                                >
                                    <div className="flex flex-col md:flex-row h-full">
                                        {/* Image Box */}
                                        <div className="md:w-1/4 relative overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border-r border-gray-50">
                                            {playlist.thumbnail ? (
                                                <img
                                                    src={getImageUrl(playlist.thumbnail?.file_path || playlist.thumbnail)}
                                                    alt={playlist.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4 text-center text-white font-bold text-sm opacity-90">
                                                    <ListMusic className="w-10 h-10 mb-2 opacity-50 block mx-auto" />
                                                    <span className="block">{playlist.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Box */}
                                        <div className="flex-1 p-5 md:p-6 flex flex-col justify-center min-w-0 bg-white">
                                            <div className="mb-4">
                                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1.5">
                                                    {playlist.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                    {playlist.description || "Explore this collection of amazing blogs curated just for you."}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-6">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                        <PlayCircle className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 leading-none">{playlist.blogs?.length || 0}</span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Blogs</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 border-l border-gray-100 pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 leading-none">{playlist.total_views || 0}</span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Views</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col border-l border-gray-100 pl-6">
                                                    <span className="text-xs font-semibold text-gray-500">Curated by</span>
                                                    <span className="text-[10px] font-bold text-indigo-600 truncate max-w-[120px]">
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
                            <div className="flex items-center justify-center gap-3 mt-16 pb-8">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1 || isFetching}
                                    className="p-3 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-2">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const p = i + 1;
                                        if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                                            if (Math.abs(p - currentPage) === 3) return <span key={p} className="text-gray-400">...</span>;
                                            return null;
                                        }
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-10 h-10 rounded-xl font-bold transition-all ${currentPage === p
                                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
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
                                    className="p-3 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-xl font-semibold text-gray-900 mb-2">No playlists found</p>
                        <p className="text-gray-500">
                            We couldn't find any public playlists matching "{submittedSearch}".
                        </p>
                        <button
                            onClick={() => { setSearchQuery(""); setSubmittedSearch(""); setCurrentPage(1); }}
                            className="mt-6 text-indigo-600 font-bold hover:text-indigo-700 underline underline-offset-4"
                        >
                            Reset Search
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
