'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import HorizontalBlogCard from "@/components/HorizontalBlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import SearchBar from "@/components/ui/search-bar";
import CategoryPills from "@/components/ui/category-pills";
import Pagination from "@/components/ui/pagination";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";
import { getBlogDate, formatDate } from "../lib/utils";

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

    // Sync URL when state changes — use replace to avoid polluting Back button history
    const updateUrl = useCallback((page, search, category) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search && search.trim() !== "") params.set("search", search.trim());
        if (category && category !== "All") params.set("category", category);

        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router]);

    // Fetch Categories
    const { data: categoriesData } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const response = await api.getBlogCategories();
            return response.results || response.categories || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const categories = ["All", ...(categoriesData ? categoriesData.map(c => typeof c === 'string' ? c : c.name) : [])];

    // Fetch Blogs
    const skip = (currentPage - 1) * BLOGS_PER_PAGE;
    const search = submittedSearch && submittedSearch.trim().length > 0 ? submittedSearch.trim() : null;
    const filter = selectedCategory === "All" ? null : selectedCategory;

    const { data: blogsData, isLoading, isFetching: isFetchingBlogs } = useQuery({
        queryKey: ["blogs", search, skip, filter],
        queryFn: async () => {
            return await api.getBlogs(search, skip, BLOGS_PER_PAGE, filter);
        },
        staleTime: 1000 * 60 * 5,
    });

    const allBlogs = blogsData?.blogs || [];
    const totalBlogs = blogsData?.total || 0;

    useEffect(() => {
        updateUrl(currentPage, submittedSearch, selectedCategory);
    }, [currentPage, submittedSearch, selectedCategory, updateUrl]);

    // Transform logic
    const transformedBlogs = allBlogs.map((blog) => ({
        slug: blog.slug,
        title: blog.title,
        description: blog.excerpt,
        image: blog.thumbnail?.file_path || blog.thumbnail || blog.image,
        category: blog.category_name || blog.category?.name || "General",
        date: formatDate(getBlogDate(blog), "Date"),
        featured: blog.featured || false,
        publishedDate: getBlogDate(blog),
        authorFullName: blog.author?.full_name,
        authorUsername: blog.author?.username || blog.author?.email || blog.author?.id,
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

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalBlogs / BLOGS_PER_PAGE);

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Blogs", href: null },
    ];

    if (isLoading) {
        return (
            <div className="py-12 border-b border-border">
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
        <div className="py-12 border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={breadcrumbItems} />

                <div className="mb-10 mt-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                        All Blogs
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Discover stories, insights, and expertise from writers on any topic.
                    </p>
                </div>

                {/* Search and Filter */}
                <div className="mb-12 space-y-6">
                    <SearchBar
                        id="blogs-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onSubmit={handleSearch}
                        placeholder="Search blogs..."
                        buttonLabel="Search"
                        disabled={isFetchingBlogs}
                    />
                    <CategoryPills
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelect={handleCategoryChange}
                    />
                </div>

                <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
                    <p className="text-muted-foreground text-sm">
                        {totalBlogs} {totalBlogs !== 1 ? "blogs" : "blog"} found
                    </p>
                </div>

                {/* Blogs List */}
                {transformedBlogs.length > 0 ? (
                    <>
                        <div className="mx-auto">
                            <div className="space-y-6">
                                {transformedBlogs.map((blog) => (
                                    <HorizontalBlogCard key={blog.slug} blog={blog} />
                                ))}
                            </div>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            disabled={isFetchingBlogs}
                        />
                    </>
                ) : (
                    <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed border-border">
                        <p className="text-lg font-semibold text-foreground mb-2">
                            {submittedSearch || selectedCategory !== "All" ? "No results found" : "No blogs yet"}
                        </p>
                        <p className="text-muted-foreground text-sm mb-6">
                            {submittedSearch || selectedCategory !== "All"
                                ? "No blogs matched your search or filters. Try adjusting your criteria."
                                : "No blogs have been published yet."}
                        </p>
                        {(submittedSearch || selectedCategory !== "All") && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSubmittedSearch("");
                                    setSelectedCategory("All");
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
