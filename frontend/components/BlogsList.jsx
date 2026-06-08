'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

    // Data States
    const [categories, setCategories] = useState(["All"]);
    const [allBlogs, setAllBlogs] = useState([]);
    const [totalBlogs, setTotalBlogs] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingBlogs, setIsFetchingBlogs] = useState(false);

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
                    <SearchBar
                        id="blogs-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onSubmit={handleSearch}
                        placeholder="QUERY INDEX..."
                        buttonLabel="Exec"
                        disabled={isFetchingBlogs}
                    />
                    <CategoryPills
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelect={handleCategoryChange}
                    />
                </div>

                <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
                    <p className="text-foreground font-mono text-sm uppercase tracking-widest">
                        Results: {totalBlogs} {totalBlogs !== 1 ? "Logs" : "Log"} Found
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
                    <div className="text-center py-16 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                        <p className="text-xl text-foreground font-mono font-bold uppercase tracking-widest mb-4">
                            {submittedSearch || selectedCategory !== "All" ? "SYS.NO_MATCH" : "SYS.EMPTY_LOGS"}
                        </p>
                        <p className="text-gray-500 font-mono text-sm mb-6">
                            {submittedSearch || selectedCategory !== "All"
                                ? `No logs matched query / category filters. Try adjusting your criteria.`
                                : "No logs found in this index."}
                        </p>
                        {(submittedSearch || selectedCategory !== "All") && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSubmittedSearch("");
                                    setSelectedCategory("All");
                                    setCurrentPage(1);
                                }}
                                className="px-6 py-3 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:bg-purple-900 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
