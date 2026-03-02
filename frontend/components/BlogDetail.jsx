'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, AlertCircle, Copy, Check, Menu, ArrowLeft, Calendar, User, Eye, Heart } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import AuthorTooltip from '@/components/AuthorTooltip';

export default function BlogDetailPage() {
    const { token } = useAuth();
    const params = useParams();
    const router = useRouter();
    const slug = params.slug;
    const username = params.username;

    const [blog, setBlog] = useState(null);
    const [suggestedBlogs, setSuggestedBlogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const [activeSection, setActiveSection] = useState('');
    const [showTOC, setShowTOC] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [isLiking, setIsLiking] = useState(false);
    const [isLikedState, setIsLikedState] = useState(false);
    const [likesCount, setLikesCount] = useState(0);

    // Define authorIdentifier for use in JSX and effects
    const authorIdentifier = blog?.author?.email || blog?.author_email || blog?.authorUsername;

    // Always go back to /blogs
    const backUrl = '/blogs';

    // 1. Fetch Blog Data Using useEffect
    useEffect(() => {
        const fetchBlog = async () => {
            if (!slug) return;
            setIsLoading(true);
            setIsError(false);
            try {
                const data = await api.getBlogBySlug(slug, token);
                if (!data) throw new Error('Blog not found');

                // Normalize content structure
                setBlog({
                    ...data,
                    content: data.content || {
                        introduction: data.introduction,
                        sections: data.sections || [],
                        conclusion: data.conclusion
                    }
                });
            } catch (err) {
                console.error("Error fetching blog:", err);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBlog();
    }, [slug, token]);

    // 2. Fetch Suggested Blogs
    useEffect(() => {
        const fetchSuggested = async () => {
            if (!blog) return;

            let relatedBlogs = [];

            // Try fetching from playlists if token exists
            if (token && (blog.id || blog._id)) {
                try {
                    const blogId = blog.id || blog._id;
                    const playlistsResponse = await api.getBlogPlaylists(blogId, token);
                    const playlists = playlistsResponse.playlists || [];

                    if (playlists.length > 0) {
                        const playlist = playlists[0];
                        const currentIndex = playlist.blogs.findIndex(
                            b => (b.blog_id === blogId || b.slug === blog.slug)
                        );

                        if (currentIndex !== -1) {
                            const prevBlogs = currentIndex > 0 ? [playlist.blogs[currentIndex - 1]] : [];
                            const nextBlogs = playlist.blogs.slice(currentIndex + 1, currentIndex + 4);
                            const targets = [...prevBlogs, ...nextBlogs];

                            const blogPromises = targets.map(async (b) => {
                                if (!b.slug) return null;
                                try {
                                    // Use api.getBlogBySlug but handle 404 gracefully
                                    const res = await api.getBlogBySlug(b.slug);
                                    return res;
                                } catch (err) {
                                    // Should be silent for 404
                                    return {
                                        id: b.blog_id,
                                        slug: b.slug,
                                        title: b.title,
                                        image: b.image,
                                        excerpt: b.excerpt,
                                        authorUsername: username
                                    };
                                }
                            });

                            const fetched = await Promise.all(blogPromises);
                            relatedBlogs = fetched.filter(b => b !== null).slice(0, 4);
                        }
                    }
                } catch (e) {
                    // Ignore 404 errors (no playlists found) or auth errors silently
                    if (e.message && (e.message.includes('404') || e.status === 404)) {
                        // silent
                    } else {
                        console.error('Playlist fetch error:', e);
                    }
                }
            }

            // Fallback/Fill with standard suggestions
            if (relatedBlogs.length < 4) {
                try {
                    const needed = 4 - relatedBlogs.length;
                    const res = await api.getSuggestedBlogs(needed, slug);
                    const filtered = (res || []).filter(
                        b => b.slug !== slug && !relatedBlogs.some(rb => rb.slug === b.slug)
                    );
                    relatedBlogs = [...relatedBlogs, ...filtered].slice(0, 4);
                } catch (e) {
                    console.error('Suggested fetch error:', e);
                }
            }
            setSuggestedBlogs(relatedBlogs);
        };

        fetchSuggested();
    }, [blog, token, slug, username]);

    // 3. Local state sync for likes
    useEffect(() => {
        if (blog) {
            setIsLikedState(blog.is_liked);
            setLikesCount(blog.likes || 0);
        }
    }, [blog]);

    // 4. Handle Redirects
    useEffect(() => {
        if (blog && username && authorIdentifier && username !== authorIdentifier) {
            router.replace(`/blogs/${authorIdentifier}/${slug}`);
        }
    }, [blog, username, slug, router, authorIdentifier]);

    // 5. Generate Table of Contents
    const tableOfContents = blog ? (() => {
        const toc = [];
        const content = blog.content;

        if (content?.introduction) {
            toc.push({ id: 'introduction', title: 'Introduction' });
        }

        if (content?.sections) {
            content.sections.forEach((section, index) => {
                if (section.title) {
                    toc.push({ id: `section-${index}`, title: section.title });
                }
            });
        }

        if (content?.conclusion) {
            toc.push({ id: 'conclusion', title: 'Conclusion' });
        }
        return toc;
    })() : [];

    // 6. Scroll Tracking
    useEffect(() => {
        const handleScroll = () => {
            // Only run if TOC exists
            if (tableOfContents.length === 0) return;

            const sections = tableOfContents.map(item => document.getElementById(item.id)).filter(Boolean);
            const scrollPosition = window.scrollY + 150; // Offset

            // Find the current section
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                if (section && section.offsetTop <= scrollPosition) {
                    setActiveSection(section.id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [tableOfContents]);


    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const offset = 100;
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({
                top: elementPosition,
                behavior: 'smooth'
            });
            setActiveSection(sectionId);
            setShowTOC(false);
        }
    };

    const copyCode = async (code, index) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    const handleLike = async () => {
        if (!blog || isLiking) return;

        try {
            if (!token) {
                toast.error('Please login to like this blog');
                return;
            }

            setIsLiking(true);
            // Use slug instead of ID for the like endpoint
            const response = await api.likeBlog(blog.slug, token);

            // Update local state based on response or toggle
            if (response && response.status) {
                setIsLikedState(response.status === 'liked');
                setLikesCount(response.total_likes);
                toast.success(response.status === 'liked' ? 'Blog liked! ❤️' : 'Blog unliked');
            } else {
                // Fallback toggle
                setIsLikedState(!isLikedState);
                setLikesCount(prev => isLikedState ? prev - 1 : prev + 1);
            }

        } catch (error) {
            console.error('Error liking blog:', error);
            toast.error('Failed to like blog');
        } finally {
            setIsLiking(false);
        }
    };

    const formatCode = (code) => {
        if (!code) return '';
        let formattedCode = code.trim();
        formattedCode = formattedCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = formattedCode.split('\n');
        if (lines.length > 1) {
            const nonEmptyLines = lines.filter(line => line.trim().length > 0);
            if (nonEmptyLines.length > 0) {
                const minIndent = Math.min(...nonEmptyLines.map(line => {
                    const match = line.match(/^(\s*)/);
                    return match ? match[1].length : 0;
                }));

                if (minIndent > 0) {
                    formattedCode = lines.map(line => {
                        if (line.trim().length === 0) return '';
                        return line.substring(minIndent);
                    }).join('\n');
                }
            }
        }
        return formattedCode;
    };

    const renderSection = (section, index) => {
        switch (section.type) {
            case 'text':
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        {section.title && (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {section.title}
                            </h3>
                        )}
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {section.content}
                        </p>
                    </div>
                );

            case 'bullets':
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        {section.title && (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {section.title}
                            </h3>
                        )}
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

            case 'table':
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        {section.title && (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {section.title}
                            </h3>
                        )}
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

            case 'note':
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        {section.title && (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {section.title}
                            </h3>
                        )}
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

            case 'links':
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        {section.title && (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {section.title}
                            </h3>
                        )}
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

            case 'image':
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        {section.title && (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {section.title}
                            </h3>
                        )}
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

            case 'code':
                const codeIndex = `code-${index}`;
                const isCopied = copiedIndex === codeIndex;
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        {section.title && (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {section.title}
                            </h3>
                        )}
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
                                        padding: '1rem',
                                        background: '#1e1e1e',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        fontFamily: "'Fira Code', 'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
                                    }}
                                >
                                    {formatCode(section.content)}
                                </SyntaxHighlighter>
                            </div>
                        </div>
                    </div>
                );

            case 'youtube':
                return (
                    <div key={index} id={`section-${index}`} className="mb-10">
                        {section.title && (
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {section.title}
                            </h3>
                        )}
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

    if (isLoading) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (isError || !blog) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Blog Post Not Found</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">The blog post you're looking for doesn't exist.</p>
                <Link href="/blogs" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Blogs
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 relative">
            <div className="flex justify-center relative z-10">
                {/* TOC Button - Fixed on Left */}
                {tableOfContents.length > 0 && (
                    <button
                        onClick={() => setShowTOC(true)}
                        className="fixed bottom-6 left-6 z-40 bg-white border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 text-gray-700 px-5 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 shadow-sm"
                    >
                        <Menu className="w-5 h-5" />
                        <span className="hidden md:inline">Table of Contents</span>
                    </button>
                )}

                {/* TOC Sheet Overlay */}
                {showTOC && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowTOC(false)}>
                        <div
                            className="absolute left-0 top-0 bottom-0 w-full sm:w-96 bg-white border-r border-gray-200 overflow-y-auto transform transition-transform duration-300 ease-out shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <Menu className="w-6 h-6 text-white" />
                                        Table of Contents
                                    </h3>
                                    <button
                                        onClick={() => setShowTOC(false)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <nav className="space-y-2">
                                    {tableOfContents.map((item, index) => (
                                        <button
                                            key={item.id}
                                            onClick={() => scrollToSection(item.id)}
                                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-300 ${activeSection === item.id
                                                ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 border-l-2 border-indigo-500'
                                                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-xs font-mono text-gray-400 mt-0.5 flex-shrink-0">
                                                    {(index + 1).toString().padStart(2, '0')}
                                                </span>
                                                <span className="flex-1">{item.title}</span>
                                            </div>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="w-full max-w-5xl px-4">
                    {/* Back Button */}
                    <Link
                        href={backUrl}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Blogs
                    </Link>

                    {/* Blog Article */}
                    <article className="bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden">
                        {/* Featured Image */}
                        <div className="relative h-[400px] w-full">
                            {(blog.thumbnail?.file_path || blog.image) ? (
                                <Image
                                    src={getImageUrl(blog.thumbnail?.file_path || blog.image)}
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
                                        {typeof blog.category === 'object' ? blog.category.name : blog.category}
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
                                <p className="text-lg text-gray-200">
                                    {blog.subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Article Content */}
                        <div className="p-6 md:p-10">
                            {/* Meta Information */}
                            <div className="flex flex-wrap gap-6 py-4 mb-6 border-y border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-5 h-5" />
                                    <span className="text-sm">{new Date(blog.publishedDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <User className="w-5 h-5" />
                                    <Link href={authorIdentifier ? `/blogs/${authorIdentifier}` : `/blogs`}>
                                        <AuthorTooltip userId={blog.author?.id || blog.user_id}>
                                            <span className="text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                {typeof blog.author === 'object' ? (blog.author.full_name || blog.author_email || blog.author.username || blog.authorUsername) : blog.author}
                                            </span>
                                        </AuthorTooltip>
                                    </Link>
                                </div>
                                {blog.views && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Eye className="w-5 h-5" />
                                        <span className="text-sm">{blog.views.toLocaleString()}</span>
                                    </div>
                                )}
                                {likesCount !== undefined && (
                                    <button
                                        onClick={handleLike}
                                        disabled={isLikedState || isLiking} // Disabled if liked
                                        className={`flex items-center gap-2 transition-all duration-300 ${isLikedState
                                            ? 'text-red-600 hover:text-red-700'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        title="Like this blog"
                                    >
                                        <Heart
                                            className={`w-5 h-5 transition-all duration-300 ${isLikedState ? 'fill-current' : ''
                                                } ${isLiking ? 'animate-pulse' : ''}`}
                                        />
                                        <span className="text-sm">{likesCount.toLocaleString()}</span>
                                    </button>
                                )}
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
                                {blog.content?.introduction && (
                                    <div id="introduction" className="mb-10">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Introduction
                                        </h2>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {blog.content.introduction}
                                        </p>
                                    </div>
                                )}

                                {/* Sections */}
                                {blog.content?.sections?.map((section, index) => renderSection(section, index))}

                                {/* Conclusion */}
                                {blog.content?.conclusion && (
                                    <div id="conclusion" className="mb-10">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Conclusion
                                        </h2>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {blog.content.conclusion}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </article>

                    {/* Related Blogs Section */}
                    <div className="mt-10 mb-8">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Related Blogs</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {suggestedBlogs.map((item, idx) => (
                                <div key={idx}>
                                    <Link href={(item.author?.email || item.author_email || item.authorUsername) ? `/blogs/${(item.author?.email || item.author_email || item.authorUsername)}/${item.slug}` : `/blogs/${item.slug}`}>
                                        <div className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md">
                                            <div className="relative aspect-[16/9] sm:aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700">
                                                {(item.thumbnail?.file_path || item.image) ? (
                                                    <img src={getImageUrl(item.thumbnail?.file_path || item.image)} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                                                        <p className="text-white text-xs font-medium opacity-50">No Image</p>
                                                    </div>
                                                )}

                                                {item.category && (
                                                    <div className="absolute top-1.5 left-1.5">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm">
                                                            {typeof item.category === 'object' ? item.category?.name : item.category}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 sm:p-2.5">
                                                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-0.5 sm:mb-1 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.title}</h3>
                                                {item.excerpt && (
                                                    <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs line-clamp-2">{item.excerpt}</p>
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
        </div>
    );
}
