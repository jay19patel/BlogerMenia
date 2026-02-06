"use client";

import { useState } from "react";
import HorizontalBlogCard from "@/components/HorizontalBlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import LoaderCard from "@/components/ui/loader";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

const BLOGS_PER_PAGE = 9;

export default function BlogsList() {
    const [searchQuery, setSearchQuery] = useState("");
    // We use a separate state for the actual search term to debounce or control when the query updates
    // But for now matching original behavior (search on button/enter)
    const [submittedSearch, setSubmittedSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch Categories
    const { data: categoriesData } = useQuery({
        queryKey: ["blogCategories"],
        queryFn: () => api.getBlogCategories(),
        select: (data) => ["All", ...(data.categories || [])],
    });

    const categories = categoriesData || ["All"];

    // Fetch Blogs
    const {
        data: blogsData,
        isLoading,
        isPlaceholderData,
    } = useQuery({
        queryKey: [
            "blogs",
            {
                search: submittedSearch || null,
                category: selectedCategory === "All" ? null : selectedCategory,
                page: currentPage,
            },
        ],
        queryFn: () => {
            const skip = (currentPage - 1) * BLOGS_PER_PAGE;
            const search =
                submittedSearch && submittedSearch.trim().length > 0
                    ? submittedSearch.trim()
                    : null;
            const filter = selectedCategory === "All" ? null : selectedCategory;
            return api.getBlogs(search, skip, BLOGS_PER_PAGE, filter);
        },
        placeholderData: keepPreviousData,
        staleTime: 60 * 1000, // 1 minute
    });

    const allBlogs = blogsData?.blogs || [];
    const totalBlogs = blogsData?.total || 0;

    // Transform logic (moved from original file)
    const transformedBlogs = allBlogs.map((blog) => ({
        slug: blog.slug,
        title: blog.title,
        description: blog.excerpt,
        image: blog.thumbnail,
        category: blog.category?.name || "General",
        date: new Date(blog.publishedDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }),
        featured: blog.featured || false,
        publishedDate: blog.publishedDate,
        authorUsername: blog.author?.username,
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
    if (!blogsData && isLoading) {
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
                                    disabled={currentPage === 1 || isPlaceholderData}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    Previous
                                </button>

                                <div className="flex items-center gap-2">
                                    {[...Array(totalPages)].map((_, index) => {
                                        const page = index + 1;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                disabled={isPlaceholderData}
                                                className={`w-10 h-10 rounded-lg font-medium transition-all duration-300 ${currentPage === page
                                                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                                                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-indigo-500"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() =>
                                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                    }
                                    disabled={currentPage === totalPages || isPlaceholderData}
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
