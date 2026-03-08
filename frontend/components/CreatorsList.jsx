"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import LoaderCard from "@/components/ui/loader";
import Breadcrumb from "@/components/Breadcrumb";

const CREATORS_PER_PAGE = 10;

export default function CreatorsList() {
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
    const [allCreators, setAllCreators] = useState([]);
    const [totalCreators, setTotalCreators] = useState(0);
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

    // Fetch Creators
    useEffect(() => {
        const fetchCreators = async () => {
            setIsFetching(true);
            try {
                const skip = (currentPage - 1) * CREATORS_PER_PAGE;
                const search = submittedSearch && submittedSearch.trim().length > 0 ? submittedSearch.trim() : null;

                const response = await api.getAllCreators(search, skip, CREATORS_PER_PAGE);
                setAllCreators(response.results || []);
                setTotalCreators(response.total || 0);
            } catch (error) {
                console.error("Error fetching creators:", error);
            } finally {
                setIsLoading(false);
                setIsFetching(false);
            }
        };

        fetchCreators();
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

    const totalPages = Math.ceil(totalCreators / CREATORS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Creators", href: null },
    ];

    if (isLoading) {
        return (
            <div className="py-12 flex justify-center items-center min-h-[400px]">
                <LoaderCard message="Loading creators…" />
            </div>
        );
    }

    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                        Our Top Creators
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl">
                        Discover the brilliant minds behind BlogerMenia's most engaging stories and insights.
                    </p>
                </div>

                {/* Search */}
                <div className="mb-12 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search creators by name, headline or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyPress}
                        className="w-full pl-12 pr-32 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all shadow-indigo-50/20"
                    />
                    <button
                        onClick={handleSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-200"
                    >
                        Search
                    </button>
                </div>

                <div className="mb-8 flex items-center justify-between">
                    <p className="text-gray-600 font-medium">
                        Showing {allCreators.length} of {totalCreators} creator
                        {totalCreators !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* Creators Grid */}
                {allCreators.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {allCreators.map((author) => (
                                <Link
                                    key={author.email}
                                    href={`/blogs/${author.email}`}
                                    className="group block bg-white border border-gray-100 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-indigo-500 transition-all duration-500 shadow-xl shadow-gray-100/30 md:h-44"
                                >
                                    <div className="flex flex-col md:flex-row h-full p-6 gap-6">
                                        {/* Left Side: Circular Avatar (Like Profile Page) */}
                                        <div className="relative w-24 h-24 shrink-0 mx-auto md:mx-0">
                                            <div className="absolute inset-0 border-4 border-indigo-50 rounded-full overflow-hidden shadow-inner group-hover:border-indigo-100 transition-colors">
                                                <img
                                                    src={author.profile_image ? getImageUrl(author.profile_image?.file_path || author.profile_image) : `https://ui-avatars.com/api/?name=${author.full_name || author.email}&background=random`}
                                                    alt={author.full_name || author.email}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            </div>
                                        </div>

                                        {/* Right Side: Content (Name, Headline, Stats) */}
                                        <div className="flex-1 flex flex-col justify-center min-w-0 text-center md:text-left">
                                            <div className="mb-3">
                                                <h3 className="font-bold text-lg md:text-xl text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                                    {author.full_name || author.email?.split('@')[0] || "User"}
                                                </h3>
                                                <p className="font-semibold text-[11px] text-indigo-600 truncate opacity-90 mb-1">
                                                    {author.email}
                                                </p>
                                                {author.headline && (
                                                    <p className="text-xs text-gray-500 line-clamp-1 italic">
                                                        {author.headline}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Stats Row (Elegant) */}
                                            <div className="flex flex-row items-center justify-center md:justify-start gap-8 pt-3 border-t border-gray-50">
                                                <div className="flex flex-col items-center md:items-start">
                                                    <span className="font-bold text-lg text-gray-900 leading-none">
                                                        {author.blog_count || 0}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                        Blogs
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center md:items-start border-l border-gray-100 pl-8">
                                                    <span className="font-bold text-lg text-gray-900 leading-none">
                                                        {(author.total_views || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                        Views
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center md:items-start border-l border-gray-100 pl-8">
                                                    <span className="font-bold text-lg text-gray-900 leading-none">
                                                        {(author.total_likes || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                        Likes
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
                        <p className="text-xl font-semibold text-gray-900 mb-2">No creators found</p>
                        <p className="text-gray-500">
                            We couldn't find any creators matching "{submittedSearch}".
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
