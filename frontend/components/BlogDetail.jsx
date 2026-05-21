'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, AlertCircle, Copy, Check, Menu, ArrowLeft, Calendar, User, Eye, Heart, ArrowRight, ArrowDown, Layers, Zap, Cloud, Cpu, Database, RefreshCw } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api } from '@/lib/api';
import { getImageUrl, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';

const Flowchart = ({ section }) => {
    const getStepColor = (color) => {
        switch (color) {
            case 'blue': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400';
            case 'indigo': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/10 dark:text-indigo-400';
            case 'violet': return 'bg-violet-50 text-violet-600 dark:bg-violet-900/10 dark:text-violet-400';
            case 'purple': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/10 dark:text-purple-400';
            case 'pink': return 'bg-pink-50 text-pink-600 dark:bg-pink-900/10 dark:text-pink-400';
            default: return 'bg-gray-50 text-gray-600 dark:bg-gray-900/10 dark:text-gray-400';
        }
    };

    const renderStep = (step, stepIndex, isBranch = false, totalInFlow = 1) => {
        const hasBranches = step.branches && step.branches.length > 0;

        return (
            <div key={step.id} className={`relative flex flex-col ${isBranch ? 'flex-1' : 'w-full'}`}>
                <div className="relative flex gap-4 group">
                    {/* Minimal Connector Line */}
                    {!isBranch && stepIndex < totalInFlow - 1 && (
                        <div className="absolute top-10 bottom-[-1.5rem] left-5 w-[1px] bg-gray-200 dark:bg-gray-700" />
                    )}

                    {/* Node - Clean Circle with Number or Dot */}
                    <div className={`relative z-10 ${isBranch ? 'w-8 h-8' : 'w-10 h-10'} rounded-full border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-sm ${getStepColor(step.color)}`}>
                        {!isBranch ? (
                            <span className="text-sm font-bold tracking-tight">{(stepIndex + 1).toString().padStart(2, '0')}</span>
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 pt-1 ml-1">
                        <div className="flex items-center gap-2">
                            <h4 className={`${isBranch ? 'text-[13px]' : 'text-sm'} font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors`}>
                                {step.title}
                            </h4>
                        </div>
                        <p className={`${isBranch ? 'text-[11px]' : 'text-[13px]'} text-gray-500 dark:text-gray-400 leading-snug mt-1 font-normal opacity-90 group-hover:opacity-100 transition-opacity`}>
                            {step.description}
                        </p>

                        {/* Minimal Branching UI */}
                        {hasBranches && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {step.branches.map((branch, bIdx) => renderStep(branch, bIdx, true))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {!isBranch && stepIndex < totalInFlow - 1 && <div className="h-6" />}
            </div>
        );
    };

    return (
        <div className="relative p-6 bg-white dark:bg-[#0d1117] rounded-xl border border-gray-100/50 dark:border-gray-800/50 mt-4 mb-8">
            <div className="relative flex flex-col">
                {section.steps?.map((step, stepIndex) => renderStep(step, stepIndex, false, section.steps.length))}
            </div>
        </div>
    );
};

const toLikeCount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeReferenceUrl = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return '#';

    const duplicatedAbsolute = value.match(/^(https?:\/\/\S+?)(https?:\/\/\S+)$/i);
    if (duplicatedAbsolute && duplicatedAbsolute[1] === duplicatedAbsolute[2]) {
        return duplicatedAbsolute[1];
    }

    if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
        return value;
    }
    if (value.startsWith('www.')) {
        return `https://${value}`;
    }
    if (value.startsWith('localhost:')) {
        return `http://${value}`;
    }
    return value;
};

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
                const normalizedContent = data.content || {
                    introduction: data.introduction,
                    sections: data.sections || [],
                    conclusion: data.conclusion
                };
                if (Array.isArray(normalizedContent.sections)) {
                    normalizedContent.sections = normalizedContent.sections.map((section) => {
                        if (section?.type !== 'links' || !Array.isArray(section.links)) {
                            return section;
                        }
                        return {
                            ...section,
                            links: section.links.map((link) => ({
                                ...link,
                                url: normalizeReferenceUrl(link?.url),
                            })),
                        };
                    });
                }

                setBlog({
                    ...data,
                    likes: toLikeCount(data.likes),
                    is_liked: Boolean(data.is_liked),
                    content: data.content || {
                        introduction: normalizedContent.introduction,
                        sections: normalizedContent.sections || [],
                        conclusion: normalizedContent.conclusion
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
            setIsLikedState(Boolean(blog.is_liked));
            setLikesCount(toLikeCount(blog.likes));
        }
    }, [blog]);

    // 4. Handle Redirects
    useEffect(() => {
        const normalizedUsername = decodeURIComponent(String(username || '')).toLowerCase();
        const normalizedAuthor = String(authorIdentifier || '').toLowerCase();
        const authorLocalPart = normalizedAuthor.split('@')[0];
        if (blog && normalizedUsername && normalizedAuthor && normalizedUsername !== normalizedAuthor && normalizedUsername !== authorLocalPart) {
            router.replace(`/blogs/${encodeURIComponent(authorIdentifier)}/${slug}`);
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
                const nextIsLiked = response.status === 'liked';
                const nextLikeCount = toLikeCount(response.total_likes);
                setIsLikedState(nextIsLiked);
                setLikesCount(nextLikeCount);
                setBlog((prev) => prev ? { ...prev, is_liked: nextIsLiked, likes: nextLikeCount } : prev);
                toast.success(response.status === 'liked' ? 'Blog liked! ❤️' : 'Blog unliked');
            } else {
                // Fallback toggle
                const nextIsLiked = !isLikedState;
                const nextLikeCount = Math.max(0, isLikedState ? likesCount - 1 : likesCount + 1);
                setIsLikedState(nextIsLiked);
                setLikesCount(nextLikeCount);
                setBlog((prev) => prev ? { ...prev, is_liked: nextIsLiked, likes: nextLikeCount } : prev);
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
                                    href={normalizeReferenceUrl(link.url)}
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
                        {(section.attachment?.file_path || section.url) && (
                            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                <img
                                    src={getImageUrl(section.attachment?.file_path || section.url)}
                                    alt={section.attachment?.filename || section.title || 'Section image'}
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
                        )}
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

            case 'flowchart':
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="w-2 h-6 bg-indigo-600 rounded-full" />
                                    {section.title}
                                </h3>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded">Interactive Flow</span>
                            </div>
                        )}
                        <Flowchart section={section} />
                    </div>
                );

            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="flex items-center justify-center gap-3 bg-background px-6 py-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                    <span className="h-5 w-5 border-2 border-foreground border-r-transparent animate-spin"></span>
                    <span className="font-mono font-bold text-sm uppercase tracking-widest text-foreground">Loading System...</span>
                </div>
            </div>
        );
    }

    if (isError || !blog) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] p-12 text-center max-w-2xl w-full">
                    <h1 className="text-4xl font-extrabold text-foreground mb-4 uppercase tracking-tight">SYSTEM.404_NOT_FOUND</h1>
                    <p className="font-mono text-sm uppercase tracking-widest text-gray-600 mb-8">The requested blog post doesn't exist or is corrupted.</p>
                    <Link href="/blogs" className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-mono font-bold uppercase tracking-widest text-xs hover:bg-purple-900 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                        Return to Directory
                    </Link>
                </div>
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
                        className="fixed bottom-6 left-6 z-40 bg-background border-2 border-foreground hover:bg-gray-100 text-foreground px-5 py-2 font-mono font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                    >
                        <Menu className="w-5 h-5" />
                        <span className="hidden md:inline">TOC</span>
                    </button>
                )}

                {/* TOC Sheet Overlay */}
                {showTOC && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowTOC(false)}>
                        <div
                            className="absolute left-0 top-0 bottom-0 w-full sm:w-96 bg-background border-r-2 border-foreground overflow-y-auto transform transition-transform duration-300 ease-out shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-foreground">
                                    <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2 uppercase tracking-tight">
                                        <Menu className="w-6 h-6 text-foreground" />
                                        Index
                                    </h3>
                                    <button
                                        onClick={() => setShowTOC(false)}
                                        className="p-2 hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-foreground"
                                    >
                                        <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <nav className="space-y-2">
                                    {tableOfContents.map((item, index) => (
                                        <button
                                            key={item.id}
                                            onClick={() => scrollToSection(item.id)}
                                            className={`w-full text-left px-4 py-3 text-sm transition-all duration-300 border-2 ${activeSection === item.id
                                                ? 'bg-foreground text-background border-foreground font-bold'
                                                : 'text-foreground border-transparent hover:border-foreground hover:bg-gray-50 font-medium'
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
                        className="inline-flex items-center gap-2 font-mono font-bold uppercase tracking-widest text-foreground hover:text-indigo-600 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Return
                    </Link>

                    {/* Blog Article */}
                    <article className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
                        {/* Featured Image */}
                        <div className="relative h-[400px] w-full border-b-2 border-foreground bg-indigo-50">
                            {(blog.thumbnail?.file_path || blog.image) ? (
                                <Image
                                    src={getImageUrl(blog.thumbnail?.file_path || blog.image)}
                                    alt={blog.title}
                                    fill
                                    className="object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-foreground flex items-center justify-center text-background">
                                    <p className="text-6xl font-mono font-bold uppercase tracking-widest opacity-50">SYS.NO_IMG</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/60" />

                            {/* Overlay Content */}
                            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 z-20">
                                <div className="max-w-4xl">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="px-3 py-1 bg-white text-black text-[10px] uppercase font-mono font-bold tracking-widest">
                                            {typeof blog.category === 'object' ? blog.category.name : blog.category}
                                        </span>
                                        {blog.featured && (
                                            <span className="px-3 py-1 border-2 border-white text-white text-[10px] uppercase font-mono font-bold tracking-widest bg-purple-900/50">
                                                Featured
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 uppercase tracking-tight leading-tight text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                        {blog.title}
                                    </h1>
                                    <p className="text-sm font-mono text-gray-200 line-clamp-2 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                                        {blog.subtitle || blog.description || blog.excerpt}
                                    </p>
                                </div>
                            </div>
                        </div>



                        {/* Article Content */}
                        <div className="p-6 md:p-10">
                            {/* Meta Information */}
                            <div className="flex flex-wrap gap-6 py-4 mb-8 border-y-2 border-foreground bg-gray-50/50 px-4">
                                <div className="flex items-center gap-2 text-foreground font-mono uppercase text-xs font-bold tracking-widest">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDate(blog.publishedDate || blog.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-foreground font-mono uppercase text-xs font-bold tracking-widest">
                                    <User className="w-4 h-4" />
                                    <Link href={authorIdentifier ? `/blogs/${encodeURIComponent(authorIdentifier)}` : `/blogs`}>
                                        <span className="cursor-pointer hover:underline hover:text-indigo-600 transition-colors">
                                            {typeof blog.author === 'object' ? (blog.author.full_name || blog.author_email || blog.author.username || blog.authorUsername) : blog.author}
                                        </span>
                                    </Link>
                                </div>
                                {blog.views !== undefined && (
                                    <div className="flex items-center gap-2 text-foreground font-mono uppercase text-xs font-bold tracking-widest">
                                        <Eye className="w-4 h-4" />
                                        <span>{blog.views.toLocaleString()}</span>
                                    </div>
                                )}
                                {likesCount !== undefined && (
                                    <button
                                        onClick={handleLike}
                                        disabled={isLiking}
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
                                            className="px-2 py-1 border border-foreground text-foreground text-[10px] font-mono font-bold uppercase tracking-widest"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Excerpt */}
                            {blog.excerpt && (
                                <div className="mb-8 p-6 bg-gray-50 border-l-4 border-foreground">
                                    <p className="text-foreground font-mono text-sm leading-relaxed">
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
                    <div className="mt-16 mb-8 pt-8 border-t-2 border-foreground">
                        <h2 className="text-2xl font-extrabold mb-6 text-foreground uppercase tracking-tight">Related Queries</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-foreground bg-foreground">
                            {suggestedBlogs.map((item, idx) => (
                                <div key={idx} className="bg-background border-r-2 last:border-r-0 border-foreground hover:bg-gray-50 transition-colors">
                                    <Link href={(item.author?.email || item.author_email || item.authorUsername) ? `/blogs/${encodeURIComponent(item.author?.email || item.author_email || item.authorUsername)}/${item.slug}` : `/blogs/${item.slug}`} className="block h-full group">
                                        <div className="flex flex-col h-full">
                                            <div className="relative aspect-video overflow-hidden bg-indigo-50 border-b-2 border-foreground">
                                                {(item.thumbnail?.file_path || item.image) ? (
                                                    <img src={getImageUrl(item.thumbnail?.file_path || item.image)} alt={item.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
                                                ) : (
                                                    <div className="w-full h-full bg-foreground flex items-center justify-center">
                                                        <p className="text-background text-[10px] font-mono font-bold uppercase tracking-widest opacity-50">Sys-Log</p>
                                                    </div>
                                                )}

                                                {item.category && (
                                                    <div className="absolute top-2 left-2">
                                                        <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest bg-foreground text-background">
                                                            {typeof item.category === 'object' ? item.category?.name : item.category}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col">
                                                <h3 className="text-sm font-extrabold text-foreground mb-2 line-clamp-2 uppercase tracking-tight group-hover:underline transition-all">{item.title}</h3>
                                                {item.excerpt && (
                                                    <p className="text-gray-600 font-mono text-[10px] line-clamp-2 leading-relaxed mt-auto">{item.excerpt}</p>
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
