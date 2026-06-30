"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import LoaderCard from "@/components/ui/loader";
import Breadcrumb from "@/components/Breadcrumb";
import SearchBar from "@/components/ui/search-bar";
import Pagination from "@/components/ui/pagination";

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

    // Sync URL when state changes — use replace to avoid polluting browser Back button history
    const updateUrl = useCallback((page, search) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search && search.trim() !== "") params.set("search", search.trim());

        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
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

    const totalPages = Math.ceil(totalCreators / CREATORS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Creators", href: null },
    ];

    if (isLoading) {
        return (
            <div className="py-24 flex justify-center items-center min-h-[400px]">
                <LoaderCard message="Loading creators…" />
            </div>
        );
    }

    return (
        <div className="py-12 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                <div className="mb-10 mt-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                        Creators
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Discover the writers behind the most engaging blogs on BlogerMenia.
                    </p>
                </div>

                {/* Search — shared SearchBar component */}
                <div className="mb-12">
                    <SearchBar
                        id="creators-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onSubmit={handleSearch}
                        placeholder="Search creators..."
                        buttonLabel="Search"
                        disabled={isFetching}
                    />
                </div>

                <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
                    <p className="text-muted-foreground text-sm">
                        Showing {allCreators.length} of {totalCreators} creator{totalCreators !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* Creators Grid */}
                {allCreators.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {allCreators.map((author) => (
                                <Link
                                    key={author.email}
                                    href={`/blogs/${author.email}`}
                                    className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all"
                                >
                                    <div className="flex flex-col sm:flex-row h-full">
                                        {/* Avatar panel */}
                                        <div className="relative w-full sm:w-1/3 shrink-0 bg-muted/40 flex flex-col justify-center items-center p-6">
                                            <div className="size-20 rounded-full ring-2 ring-border overflow-hidden relative">
                                                {author.profile_image ? (
                                                    <Image
                                                        src={getImageUrl(author.profile_image?.file_path || author.profile_image)}
                                                        alt={author.full_name || author.email}
                                                        fill
                                                        sizes="80px"
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary rounded-full">
                                                        <span className="font-bold text-2xl">
                                                            {(author.full_name?.[0] || author.email?.[0] || 'U')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 flex flex-col justify-center p-5">
                                            <div className="mb-3 border-b border-border pb-3">
                                                <h3 className="font-semibold text-lg text-foreground truncate">
                                                    {author.full_name || author.email?.split('@')[0] || "User"}
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate mb-1">
                                                    {author.email}
                                                </p>
                                                {author.headline && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 italic">
                                                        {author.headline}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-row items-center gap-5">
                                                {[
                                                    { value: author.blog_count || 0, label: "Blogs" },
                                                    { value: (author.total_views || 0).toLocaleString(), label: "Views" },
                                                    { value: (author.total_likes || 0).toLocaleString(), label: "Likes" },
                                                ].map(({ value, label }, i, arr) => (
                                                    <div key={label} className="flex items-center gap-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-base text-foreground leading-none">
                                                                {value}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground mt-0.5">
                                                                {label}
                                                            </span>
                                                        </div>
                                                        {i < arr.length - 1 && <div className="h-6 w-px bg-border" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            disabled={isFetching}
                        />
                    </>
                ) : (
                    <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed border-border">
                        <p className="text-lg font-semibold text-foreground mb-2">No creators found</p>
                        <p className="text-muted-foreground text-sm mb-6">
                            {submittedSearch ? `No creators matching "${submittedSearch}".` : "No creators available yet."}
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
