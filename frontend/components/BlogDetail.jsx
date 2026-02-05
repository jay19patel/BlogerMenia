"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, AlertCircle, Copy, Check, Menu, ArrowLeft, Calendar, User, Eye, Heart } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { api } from "@/lib/api";
import AuthorTooltip from "@/components/AuthorTooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function BlogDetail({ slug, username }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [activeSection, setActiveSection] = useState("");
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [tableOfContents, setTableOfContents] = useState([]);

    // Fetch blog data
    const { data: blog, isLoading: isBlogLoading } = useQuery({
        queryKey: ["blog", slug],
        queryFn: async () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
            const foundBlog = await api.getBlogBySlug(slug, token);
            if (!foundBlog) throw new Error("Blog not found");
            return foundBlog;
        },
        staleTime: 0, // Always refetch on mount to check "is_liked" status with user token
    });

    // Handle redirection if username doesn't match
    useEffect(() => {
        if (blog && username && blog.author?.username && username !== blog.author.username) {
            router.replace(`/blogs/${blog.author.username}/${slug}`);
        }
    }, [blog, username, slug, router]);

    // Generate TOC
    useEffect(() => {
        if (blog?.content) {
            const toc = [];
            // Backend returns flat structure now, so use blog directly
            // const content = blog.content; -> No longer needed if we access blog directly
            const content = blog;

            if (content?.introduction) {
                toc.push({ id: "introduction", title: "Introduction" });
            }

            if (content?.sections) {
                content.sections.forEach((section, index) => {
                    if (section.title) {
                        toc.push({ id: `section-${index}`, title: section.title });
                    }
                });
            }

            if (content?.conclusion) {
                toc.push({ id: "conclusion", title: "Conclusion" });
            }

            setTableOfContents(toc);
        }
    }, [blog]);

    // Suggested Blogs Query
    const { data: suggestedBlogs = [] } = useQuery({
        queryKey: ["suggestedBlogs", slug],
        queryFn: async () => {
            if (!blog) return [];

            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
            let relatedBlogs = [];

            // Try fetching from playlists if token exists
            if (token && blog) {
                try {
                    const blogId = blog.id || blog._id;
                    const playlistsResponse = await api.getBlogPlaylists(blogId, token);
                    const playlists = playlistsResponse.playlists || [];

                    if (playlists.length > 0) {
                        const playlist = playlists[0];
                        const currentIndex = playlist.blogs.findIndex(
                            (b) => b.blog_id === blogId || b.slug === blog.slug
                        );

                        if (currentIndex !== -1) {
                            const prevBlogs = currentIndex > 0 ? [playlist.blogs[currentIndex - 1]] : [];
                            const nextBlogs = playlist.blogs.slice(currentIndex + 1, currentIndex + 4);

                            // Fetch details for these blogs
                            // Note: Simplified for this implementation, doing sequential fetches or parallel
                            const blogItems = [...prevBlogs, ...nextBlogs];
                            const detailsPromises = blogItems.map(async (item) => {
                                try {
                                    // We prioritize getting by slug if available, else skip or try by ID if api supports it
                                    // The original code tried to get full blog by slug
                                    if (item.slug) {
                                        return await api.getBlogBySlug(item.slug);
                                    }
                                    return { ...item, authorUsername: username }; // Limited data fallback
                                } catch {
                                    return { ...item, authorUsername: username };
                                }
                            });
                            relatedBlogs = await Promise.all(detailsPromises);
                        }
                    }
                } catch (e) {
                    console.error("Playlist related fetch error", e);
                }
            }

            if (relatedBlogs.length < 4) {
                try {
                    const res = await api.getSuggestedBlogs(4 - relatedBlogs.length, slug);
                    const filtered = (res || []).filter(
                        (b) => b.slug !== slug && !relatedBlogs.some((rb) => rb.slug === b.slug)
                    );
                    relatedBlogs = [...relatedBlogs, ...filtered].slice(0, 4);
                } catch (e) {
                    console.error("Suggested fetch error", e);
                }
            }
            return relatedBlogs;
        },
        enabled: !!blog, // Only run if blog is loaded
        staleTime: 5 * 60 * 1000,
    });


    // Mutation for Liking
    const likeMutation = useMutation({
        mutationFn: async () => {
            // Backend lookup_field is 'slug', so we must pass slug, not ID.
            const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
            return await api.likeBlog(blog.slug, token);
        },
        onMutate: async () => {
            await queryClient.cancelQueries(["blog", slug]);
            const previousBlog = queryClient.getQueryData(["blog", slug]);

            // Optimistic update
            queryClient.setQueryData(["blog", slug], (old) => {
                if (!old) return old;
                const wasLiked = old.is_liked;
                return {
                    ...old,
                    likes: wasLiked ? (old.likes || 1) - 1 : (old.likes || 0) + 1,
                    is_liked: !wasLiked,
                };
            });
            return { previousBlog };
        },
        onError: (err, newTodo, context) => {
            toast.error("Failed to like blog");
            queryClient.setQueryData(["blog", slug], context.previousBlog);
        },
        onSuccess: (data) => {
            toast.success("Blog liked! ❤️");
            // Invalidate to refetch fresh data (e.g. valid like count)
            queryClient.invalidateQueries(["blog", slug]);
        },
    });

    // Scroll tracking
    useEffect(() => {
        const handleScroll = () => {
            const sections = tableOfContents.map((item) => document.getElementById(item.id)).filter(Boolean);
            const scrollPosition = window.scrollY + 150;

            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                if (section && section.offsetTop <= scrollPosition) {
                    setActiveSection(section.id);
                    break;
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [tableOfContents]);


    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const offset = 100;
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({
                top: elementPosition,
                behavior: "smooth",
            });
            setActiveSection(sectionId);
            setIsSheetOpen(false);
        }
    };

    const copyCode = async (code, index) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error("Failed to copy code:", err);
        }
    };

    const formatCode = (code) => {
        if (!code) return "";
        let formattedCode = code.trim();
        formattedCode = formattedCode.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        const lines = formattedCode.split("\n");
        if (lines.length > 1) {
            const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
            if (nonEmptyLines.length > 0) {
                const minIndent = Math.min(
                    ...nonEmptyLines.map((line) => {
                        const match = line.match(/^(\s*)/);
                        return match ? match[1].length : 0;
                    })
                );

                if (minIndent > 0) {
                    formattedCode = lines
                        .map((line) => {
                            if (line.trim().length === 0) return "";
                            return line.substring(minIndent);
                        })
                        .join("\n");
                }
            }
        }
        return formattedCode;
    };

    const renderSection = (section, index) => {
        switch (section.type) {
            case "text":
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {section.title}
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {section.content}
                        </p>
                    </div>
                );

            case "bullets":
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {section.title}
                        </h3>
                        <ul className="space-y-3">
                            {section.items?.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );

            case "table":
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {section.title}
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        {section.headers?.map((header, headerIndex) => (
                                            <th
                                                key={headerIndex}
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {section.rows?.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => (
                                                <td
                                                    key={cellIndex}
                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                                >
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case "note":
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {section.title}
                        </h3>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded-r-lg">
                            <div className="flex items-start">
                                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                                <p className="text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                                    {section.content}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case "links":
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {section.title}
                        </h3>
                        <div className="grid gap-4">
                            {section.links?.map((link, linkIndex) => (
                                <a
                                    key={linkIndex}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1">
                                                {link.text}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {link.description}
                                            </p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 ml-2 flex-shrink-0" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                );

            case "image":
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {section.title}
                        </h3>
                        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img
                                src={section.url}
                                alt={section.alt || section.title}
                                className="w-full h-auto"
                                loading="lazy"
                            />
                            {section.caption && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center italic">
                                        {section.caption}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case "code":
                const codeIndex = `code-${index}`;
                const isCopied = copiedIndex === codeIndex;
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {section.title}
                        </h3>
                        <div className="relative group">
                            {/* Code header */}
                            <div className="absolute top-0 left-0 right-0 bg-[#2d2d30] border-b border-[#3e3e42] px-4 py-2 rounded-t-lg flex items-center justify-between z-10">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#28ca42]"></div>
                                    </div>
                                    <span className="ml-2 text-[#cccccc] text-xs font-mono">
                                        {section.language}
                                    </span>
                                </div>
                                <button
                                    onClick={() => copyCode(formatCode(section.content), codeIndex)}
                                    className="flex items-center gap-1 px-2 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs rounded font-mono transition-all duration-200 opacity-0 group-hover:opacity-100"
                                    title="Copy code"
                                >
                                    {isCopied ? (
                                        <>
                                            <Check className="w-3 h-3" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Code block */}
                            <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#333] shadow-2xl pt-12">
                                <SyntaxHighlighter
                                    language={section.language}
                                    style={vscDarkPlus}
                                    showLineNumbers={false}
                                    wrapLines={true}
                                    customStyle={{
                                        margin: 0,
                                        padding: "1rem",
                                        background: "#1e1e1e",
                                        fontSize: "14px",
                                        lineHeight: "1.5",
                                        fontFamily:
                                            "'Fira Code', 'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                                    }}
                                >
                                    {formatCode(section.content)}
                                </SyntaxHighlighter>
                            </div>
                        </div>
                    </div>
                );

            case "youtube":
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {section.title}
                        </h3>
                        <div className="aspect-video">
                            <iframe
                                src={`https://www.youtube.com/embed/${section.videoId}`}
                                title={section.videoTitle || section.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full rounded-lg"
                            />
                        </div>
                        {section.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm italic mt-2">
                                {section.description}
                            </p>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    if (isBlogLoading) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    Blog Post Not Found
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    The blog post you're looking for doesn't exist.
                </p>
                <Link
                    href="/blogs"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Blogs
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 relative">
            <div className="flex justify-center relative z-10">
                {/* TOC Button & Sheet - Fixed on Left */}
                {tableOfContents.length > 0 && (
                    <div className="fixed bottom-6 left-6 z-40">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <button
                                    className="bg-white border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 text-gray-700 px-5 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 shadow-sm"
                                >
                                    <Menu className="w-5 h-5" />
                                    <span className="hidden md:inline">Table of Contents</span>
                                </button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                                <SheetHeader>
                                    <SheetTitle className="flex items-center gap-2">
                                        <Menu className="w-5 h-5" />
                                        Table of Contents
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="mt-6 flex-1 overflow-y-auto pr-2 max-h-[calc(100vh-100px)]">
                                    <nav className="space-y-1">
                                        {tableOfContents.map((item, index) => (
                                            <button
                                                key={item.id}
                                                onClick={() => scrollToSection(item.id)}
                                                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${activeSection === item.id
                                                        ? "bg-indigo-50 text-indigo-700 font-medium"
                                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className={`text-xs font-mono mt-0.5 flex-shrink-0 ${activeSection === item.id ? "text-indigo-400" : "text-gray-400"
                                                        }`}>
                                                        {(index + 1).toString().padStart(2, "0")}
                                                    </span>
                                                    <span className="flex-1 leading-snug">{item.title}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </nav>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                )}

                {/* Main Content */}
                <div className="w-full max-w-5xl px-4">
                    {/* Back Button */}
                    <Link
                        href="/blogs"
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Blogs
                    </Link>

                    <article className="bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden">
                        {/* Featured Image */}
                        <div className="relative h-[400px] w-full">
                            {blog.image && blog.image.trim() !== "" ? (
                                <Image
                                    src={blog.image}
                                    alt={blog.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                                    <div className="text-center text-white">
                                        <p className="text-6xl font-bold opacity-50">Blog Image</p>
                                    </div>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                            {/* Overlay Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-3 py-1 bg-blue-600/80 backdrop-blur-sm rounded-lg text-sm font-medium">
                                        {blog.category?.name || "General"}
                                    </span>
                                    {blog.featured && (
                                        <span className="px-3 py-1 bg-yellow-500/80 backdrop-blur-sm rounded-lg text-sm font-medium">
                                            Featured
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                    {blog.title}
                                </h1>
                                <p className="text-lg text-gray-200">{blog.subtitle}</p>
                            </div>
                        </div>

                        {/* Article Content */}
                        <div className="p-6 md:p-10">
                            {/* Meta Information */}
                            <div className="flex flex-wrap gap-6 py-4 mb-6 border-y border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-5 h-5" />
                                    <span className="text-sm">
                                        {new Date(blog.publishedDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    {blog.author?.profile_image ? (
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                                            <img
                                                src={blog.author.profile_image}
                                                alt={blog.author.username}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                                            {blog.author?.username ? blog.author.username[0].toUpperCase() : "?"}
                                        </div>
                                    )}
                                    <Link
                                        href={
                                            blog.author?.username
                                                ? `/blogs/${blog.author.username}`
                                                : `/blogs`
                                        }
                                    >
                                        <AuthorTooltip userId={blog.author?.id}>
                                            <span className="text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                {blog.author?.username || "Unknown"}
                                            </span>
                                        </AuthorTooltip>
                                    </Link>
                                </div>
                                {blog.views && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Eye className="w-5 h-5" />
                                        <span className="text-sm">
                                            {blog.views.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {/* Like Button */}
                                <button
                                    onClick={() => likeMutation.mutate()}
                                    disabled={likeMutation.isPending}
                                    className={`flex items-center gap-2 transition-all duration-300 ${blog.is_liked
                                        ? "text-red-600"
                                        : "text-gray-600 hover:text-red-600"
                                        }`}
                                    title={blog.is_liked ? "Unlike" : "Like"}
                                >
                                    <Heart
                                        className={`w-5 h-5 transition-all duration-300 ${blog.is_liked ? "fill-current" : ""
                                            } ${likeMutation.isPending ? "animate-pulse text-red-500" : ""}`}
                                    />
                                    <span className="text-sm font-medium">
                                        {blog.likes || 0}
                                    </span>
                                </button>
                            </div>

                            {/* Tags */}
                            {blog.tags && blog.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {blog.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Excerpt */}
                            {blog.excerpt && (
                                <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
                                    <p className="text-gray-700 dark:text-gray-300 italic">
                                        {blog.excerpt}
                                    </p>
                                </div>
                            )}

                            {/* Content */}
                            <div className="prose prose-lg dark:prose-invert max-w-none">
                                {/* Introduction */}
                                {blog.introduction && (
                                    <div id="introduction" className="mb-10">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Introduction
                                        </h2>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {blog.introduction}
                                        </p>
                                    </div>
                                )}

                                {/* Sections */}
                                {blog.sections?.map((section, index) =>
                                    renderSection(section, index)
                                )}

                                {/* Conclusion */}
                                {blog.conclusion && (
                                    <div id="conclusion" className="mb-10">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Conclusion
                                        </h2>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {blog.conclusion}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </article>

                    {/* Related Blogs Section */}
                    <div className="mt-10 mb-8">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            Related Blogs
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {suggestedBlogs.map((item, idx) => (
                                <div key={idx}>
                                    <Link
                                        href={
                                            item.author?.username
                                                ? `/blogs/${item.author.username}/${item.slug}`
                                                : `/blogs/${item.slug}`
                                        }
                                    >
                                        <div className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md">
                                            <div className="relative aspect-[16/9] sm:aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700">
                                                {item.image && item.image.trim() !== "" ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                                                        <p className="text-white text-xs font-medium opacity-50">
                                                            No Image
                                                        </p>
                                                    </div>
                                                )}
                                                {item.category && (
                                                    <div className="absolute top-1.5 left-1.5">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm">
                                                            {item.category?.name || "General"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 sm:p-2.5">
                                                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-0.5 sm:mb-1 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {item.title}
                                                </h3>
                                                {item.excerpt && (
                                                    <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs line-clamp-2">
                                                        {item.excerpt}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
