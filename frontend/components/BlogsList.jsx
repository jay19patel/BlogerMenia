"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import HorizontalBlogCard from "@/components/HorizontalBlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";

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
                setCategories(["All", ...(response.categories || [])]);
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
        image: blog.thumbnail?.file_path || blog.image,
        category: blog.category?.name || "General",
        date: new Date(blog.publishedDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }),
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
        { label: "Blogs", href: null },
    ];

    // Derived state for layout
    // Note: using transformedBlogs here
    // Latest 3 blogs logic
    const isDefaultView =
        currentPage === 1 && !submittedSearch && selectedCategory === "All";
    const latestBlogs = isDefaultView ? transformedBlogs.slice(0, 3) : [];
    const [latestBlog, ...otherLatestBlogs] = latestBlogs;
    const remainingBlogs =
        latestBlogs.length > 0 ? transformedBlogs.slice(3) : transformedBlogs;

    // Loading state
    // We only show full loader if it's the very first load and we have no data
    if (isLoading) {
        return (
            <div className="py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative h-40 sm:h-48 lg:h-56">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoaderCard message="Loading blogs…" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Explore Our Blogs
                    </h1>
                    <p className="text-lg text-gray-600">
                        Discover stories, thinking, and expertise from writers on any topic.
                    </p>
                </div>

                {/* Search and Filter */}
                <div className="mb-12 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search blogs by title or content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyPress}
                            className="w-full pl-12 pr-24 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                            onClick={handleSearch}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            Search
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => handleCategoryChange(category)}
                                className={`px-5 py-2 rounded-lg font-medium transition-all duration-300 ${selectedCategory === category
                                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                                    : "bg-white text-gray-700 border border-gray-300 hover:border-indigo-500 hover:text-indigo-600"
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <p className="text-gray-600">
                        Showing {transformedBlogs.length} of {totalBlogs} blog
                        {totalBlogs !== 1 ? "s" : ""}
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
                            <div className="flex items-center justify-center gap-2 mt-12 pb-8">
                                <button
                                    onClick={() =>
                                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                                    }
                                    disabled={currentPage === 1 || isFetchingBlogs}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    Previous
                                </button>

                                <div className="flex items-center gap-2">
                                    {(() => {
                                        // Helper to generate pagination range
                                        const getPaginationRange = (current, total) => {
                                            if (total <= 7) {
                                                return Array.from({ length: total }, (_, i) => i + 1);
                                            }

                                            // Always show first 3
                                            let pages = [1, 2, 3];

                                            // Always show last 3
                                            pages.push(total - 2, total - 1, total);

                                            // Show current and neighbors
                                            if (current > 1 && current < total) {
                                                pages.push(current - 1, current, current + 1);
                                            }

                                            // Filter out-of-bounds and sort, then unique
                                            pages = [...new Set(pages)].filter(p => p > 0 && p <= total).sort((a, b) => a - b);

                                            // Insert ellipses
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
                                                    <span key={`dots-${index}`} className="px-2 text-gray-400">
                                                        ...
                                                    </span>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    disabled={isFetchingBlogs}
                                                    className={`w-10 h-10 rounded-lg font-medium transition-all duration-300 ${currentPage === page
                                                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                                                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-indigo-500"
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
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    Next
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-xl text-gray-600 mb-4">No blogs found</p>
                        <p className="text-gray-500">
                            Try adjusting your search or filter to find what you're looking for.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
