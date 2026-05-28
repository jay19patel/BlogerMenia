'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import HorizontalBlogCard from "@/components/HorizontalBlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";
import { formatDate } from "../lib/utils";

const BLOGS_PER_PAGE = 9;

export default function BlogsList() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Read initial states from URL
    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const initialSearch = searchParams.get("search") || "";
    const initialCategory = searchParams.get("category") || "All";

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [currentPage, setCurrentPage] = useState(initialPage);

    // Data States
    const [categories, setCategories] = useState(["All"]);
    const [allBlogs, setAllBlogs] = useState([]);
    const [totalBlogs, setTotalBlogs] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
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

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.getBlogCategories();
                const categoriesList = response.results || response.categories || [];
                setCategories(["All", ...categoriesList.map(c => typeof c === 'string' ? c : c.name)]);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Blogs
    useEffect(() => {
        const fetchBlogs = async () => {
            setIsFetchingBlogs(true);
            try {
                const skip = (currentPage - 1) * BLOGS_PER_PAGE;
                const search = submittedSearch && submittedSearch.trim().length > 0 ? submittedSearch.trim() : null;
                const filter = selectedCategory === "All" ? null : selectedCategory;

                const response = await api.getBlogs(search, skip, BLOGS_PER_PAGE, filter);
                setAllBlogs(response.blogs || []);
                setTotalBlogs(response.total || 0);
            } catch (error) {
                console.error("Error fetching blogs:", error);
            } finally {
                setIsLoading(false);
                setIsFetchingBlogs(false);
            }
        };

        fetchBlogs();
        updateUrl(currentPage, submittedSearch, selectedCategory);
    }, [currentPage, submittedSearch, selectedCategory, updateUrl]);

    // Transform logic
    const transformedBlogs = allBlogs.map((blog) => ({
        slug: blog.slug,
        title: blog.title,
        description: blog.excerpt,
        image: blog.thumbnail?.file_path || blog.thumbnail || blog.image,
        category: blog.category_name || blog.category?.name || "General",
        date: formatDate(blog.publishedDate || blog.created_at),
        featured: blog.featured || false,
        publishedDate: blog.publishedDate,
        authorFullName: blog.author?.full_name,
        authorUsername: blog.author?.username || blog.author?.email,
        authorEmail: blog.author?.email,
        views: blog.views,
        likes: blog.likes
    }));

    // Handlers
    const handleSearch = () => {
        setCurrentPage(1);
        const val = searchQuery.trim();
        setSubmittedSearch(val);
    };

    const handleSearchKeyPress = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSearch();
        }
    };

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "System Logs", href: null },
    ];

    if (isLoading) {
        return (
            <div className="py-12 border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative h-40 sm:h-48 lg:h-56">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoaderCard message="Fetching logs…" />
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

                <div className="mb-12 border-b-2 border-foreground pb-8 mt-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 uppercase tracking-tight">
                        System Logs
                    </h1>
                    <p className="text-lg text-gray-600 font-mono">
                        Query the cluster for engineering insights and technical documentation.
                    </p>
                </div>

                {/* Search and Filter */}
                <div className="mb-12 space-y-6">
                    <div className="relative border-2 border-foreground bg-background focus-within:ring-2 focus-within:ring-foreground transition-all flex h-14">
                        <div className="flex items-center justify-center pl-4 bg-background">
                            <Search className="text-foreground w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="QUERY INDEX..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyPress}
                            className="w-full px-4 py-3 bg-transparent text-foreground placeholder-gray-400 focus:outline-none font-mono uppercase text-sm"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-8 py-3 bg-foreground text-background font-bold uppercase tracking-widest hover:bg-gray-800 transition-all border-l-2 border-foreground hover:shadow-[6px_6px_0px_0px_rgba(88,28,135,1)] hover:-translate-x-1 hover:-translate-y-1"
                        >
                            Exec
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => handleCategoryChange(category)}
                                className={`px-4 py-2 font-mono text-xs uppercase tracking-widest font-bold transition-all border-2 border-foreground ${selectedCategory === category
                                    ? "bg-foreground text-background shadow-[4px_4px_0px_0px_rgba(88,28,135,1)]"
                                    : "bg-background text-foreground hover:bg-gray-100 hover:shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] hover:-translate-y-1"
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
                    <p className="text-foreground font-mono text-sm uppercase tracking-widest">
                        Results: {totalBlogs} {totalBlogs !== 1 ? "Logs" : "Log"} Found
                    </p>
                </div>

                {/* Blogs List - Single Column */}
                {transformedBlogs.length > 0 ? (
                    <>
                        <div className="mx-auto">
                            <div className="space-y-6">
                                {transformedBlogs.map((blog) => (
                                    <HorizontalBlogCard key={blog.slug} blog={blog} />
                                ))}
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-16 pb-8 font-mono">
                                <button
                                    onClick={() =>
                                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                                    }
                                    disabled={currentPage === 1 || isFetchingBlogs}
                                    className="flex items-center justify-center w-10 h-10 bg-background border-2 border-foreground text-foreground hover:bg-gray-100 hover:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-2">
                                    {(() => {
                                        const getPaginationRange = (current, total) => {
                                            if (total <= 7) {
                                                return Array.from({ length: total }, (_, i) => i + 1);
                                            }

                                            let pages = [1, 2, 3];
                                            pages.push(total - 2, total - 1, total);
                                            if (current > 1 && current < total) {
                                                pages.push(current - 1, current, current + 1);
                                            }

                                            pages = [...new Set(pages)].filter(p => p > 0 && p <= total).sort((a, b) => a - b);

                                            const result = [];
                                            for (let i = 0; i < pages.length; i++) {
                                                if (i > 0 && pages[i] - pages[i - 1] > 1) {
                                                    result.push('...');
                                                }
                                                result.push(pages[i]);
                                            }

                                            return result;
                                        };

                                        const paginationRange = getPaginationRange(currentPage, totalPages);

                                        return paginationRange.map((page, index) => {
                                            if (page === '...') {
                                                return (
                                                    <span key={`dots-${index}`} className="px-2 text-foreground font-bold">
                                                        ...
                                                    </span>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    disabled={isFetchingBlogs}
                                                    className={`w-10 h-10 flex items-center justify-center font-bold text-sm uppercase transition-all border-2 border-foreground ${currentPage === page
                                                        ? "bg-foreground text-background shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]"
                                                        : "bg-background text-foreground hover:bg-gray-100"
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>

                                <button
                                    onClick={() =>
                                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                    }
                                    disabled={currentPage === totalPages || isFetchingBlogs}
                                    className="flex items-center justify-center w-10 h-10 bg-background border-2 border-foreground text-foreground hover:bg-gray-100 hover:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed border-gray-300">
                        <p className="text-xl text-foreground font-mono font-bold uppercase tracking-widest mb-4">No logs matched query</p>
                        <p className="text-gray-500 font-mono text-sm">
                            Try adjusting your search criteria.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
