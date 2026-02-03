"use client";

import { useState } from "react";
import BlogCard from "@/components/BlogCard";
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

                {/* Featured / Latest Section */}
                {latestBlogs.length > 0 && (
                    <div className="mb-16">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                            Latest Articles
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Large Featured */}
                            {latestBlog && (
                                <Link
                                    href={
                                        latestBlog.authorUsername
                                            ? `/blogs/${latestBlog.authorUsername}/${latestBlog.slug}`
                                            : `/blogs/${latestBlog.slug}`
                                    }
                                    className="lg:col-span-2 group"
                                >
                                    <div className="relative h-full bg-white border border-gray-300 rounded-xl overflow-hidden hover:border-indigo-500 hover:shadow-lg transition-all duration-300">
                                        <div className="aspect-[16/9] relative overflow-hidden">
                                            {latestBlog.image && latestBlog.image.trim() !== "" ? (
                                                <img
                                                    src={latestBlog.image}
                                                    alt={latestBlog.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                                                    <p className="text-white text-4xl font-bold opacity-50">
                                                        No Image
                                                    </p>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                        </div>
                                        <div className="p-6">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-full">
                                                    {latestBlog.category}
                                                </span>
                                                <span className="text-gray-500 text-sm">
                                                    {latestBlog.date}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                                                {latestBlog.title}
                                            </h3>
                                            <p className="text-gray-600 line-clamp-2">
                                                {latestBlog.description}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            )}

                            {/* Smaller List */}
                            <div className="space-y-6">
                                {otherLatestBlogs.map((blog) => (
                                    <Link
                                        href={
                                            blog.authorUsername
                                                ? `/blogs/${blog.authorUsername}/${blog.slug}`
                                                : `/blogs/${blog.slug}`
                                        }
                                        key={blog.slug}
                                        className="group block"
                                    >
                                        <div className="bg-white border border-gray-300 rounded-xl overflow-hidden hover:border-indigo-500 hover:shadow-lg transition-all duration-300">
                                            <div className="aspect-[16/9] relative overflow-hidden">
                                                {blog.image && blog.image.trim() !== "" ? (
                                                    <img
                                                        src={blog.image}
                                                        alt={blog.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                                                        <p className="text-white text-2xl font-bold opacity-50">
                                                            No Image
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-1 bg-violet-100 text-violet-600 text-xs font-semibold rounded-full">
                                                        {blog.category}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        {blog.date}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                    {blog.title}
                                                </h3>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid of Remaining Blogs */}
                {transformedBlogs.length > 0 ? (
                    <>
                        {isDefaultView && remainingBlogs.length > 0 && (
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                                All Articles
                            </h2>
                        )}

                        <div className="relative mb-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {remainingBlogs.map((blog) => (
                                    <BlogCard key={blog.slug} blog={blog} />
                                ))}
                            </div>

                            {/* Show small loader overlay if fetching next page/filtering (but keeping previous data) */}
                            {isPlaceholderData && (
                                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                                    <LoaderCard message="Updating..." />
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
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
                            Try adjusting your search or filter to find what you're looking
                            for.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
