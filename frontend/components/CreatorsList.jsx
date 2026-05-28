"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
            <div className="py-24 flex justify-center items-center min-h-[400px]">
                <LoaderCard message="Loading architects…" />
            </div>
        );
    }

    return (
        <div className="py-12 bg-gray-50/50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                <div className="mb-10 border-b-2 border-foreground pb-6 mt-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-foreground uppercase tracking-tight mb-4">
                        Architects
                    </h1>
                    <p className="text-lg font-mono text-gray-600 max-w-2xl">
                        The brilliant engineering minds behind the platform's most engaging documentation.
                    </p>
                </div>

                {/* Search */}
                <div className="mb-12 relative flex border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(88,28,135,1)]">
                    <input
                        type="text"
                        placeholder="query architect index..."
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
                        Showing {allCreators.length} of {totalCreators} Architect{totalCreators !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* Creators Grid */}
                {allCreators.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {allCreators.map((author) => (
                                <Link
                                    key={author.email}
                                    href={`/blogs/${author.email}`}
                                    className="group block bg-background border-2 border-foreground hover:shadow-[6px_6px_0px_0px_rgba(88,28,135,1)] transition-all md:h-48"
                                >
                                    <div className="flex flex-col sm:flex-row h-full">
                                        {/* Left Side: Avatar */}
                                        <div className="relative w-full sm:w-1/3 shrink-0 border-b-2 sm:border-b-0 sm:border-r-2 border-foreground bg-indigo-50 flex flex-col justify-center items-center p-6">
                                            <div className="w-20 h-20 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] bg-white overflow-hidden relative">
                                                {author.profile_image ? (
                                                    <Image
                                                        src={getImageUrl(author.profile_image?.file_path || author.profile_image)}
                                                        alt={author.full_name || author.email}
                                                        fill
                                                        sizes="80px"
                                                        className="object-cover transition-all"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-foreground flex items-center justify-center text-background">
                                                        <span className="font-mono font-bold text-4xl uppercase tracking-widest">
                                                            {(author.full_name?.[0] || author.email?.[0] || 'U')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Side: Content (Name, Headline, Stats) */}
                                        <div className="flex-1 flex flex-col justify-center p-6 bg-background">
                                            <div className="mb-4 border-b border-gray-200 pb-4">
                                                <h3 className="font-extrabold text-xl text-foreground uppercase truncate group-hover:text-indigo-600 transition-colors tracking-tight">
                                                    {author.full_name || author.email?.split('@')[0] || "User"}
                                                </h3>
                                                <p className="font-mono text-[10px] text-gray-500 truncate mb-2 uppercase">
                                                    {author.email}
                                                </p>
                                                {author.headline && (
                                                    <p className="text-xs text-gray-600 line-clamp-1 italic font-serif">
                                                        "{author.headline}"
                                                    </p>
                                                )}
                                            </div>

                                            {/* Stats Row (Elegant) */}
                                            <div className="flex flex-row items-center gap-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-lg text-foreground font-mono leading-none">
                                                        {author.blog_count || 0}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mt-1">
                                                        Deployments
                                                    </span>
                                                </div>
                                                <div className="h-6 w-px bg-gray-200"></div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-lg text-foreground font-mono leading-none">
                                                        {(author.total_views || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mt-1">
                                                        Hits
                                                    </span>
                                                </div>
                                                <div className="h-6 w-px bg-gray-200"></div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-lg text-foreground font-mono leading-none">
                                                        {(author.total_likes || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mt-1">
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
                        <p className="text-2xl font-extrabold text-foreground mb-4 uppercase tracking-tight">No architects found</p>
                        <p className="text-gray-600 font-mono">
                            We couldn't find any creators matching "{submittedSearch}".
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
