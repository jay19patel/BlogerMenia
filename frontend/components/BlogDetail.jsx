'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, AlertCircle, Copy, Check, Menu, ArrowLeft, Calendar, User, Eye, Heart, ArrowRight, ArrowDown, Layers, Zap, Cloud, Cpu, Database, RefreshCw, GitBranch, Bookmark, BookmarkCheck } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api } from '@/lib/api';
import { getBlogDate, getImageUrl, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';

const Flowchart = ({ section }) => {
    const getStepColor = (color) => {
        switch (color) {
            case 'blue': return 'bg-blue-100 text-blue-700';
            case 'indigo': return 'bg-indigo-100 text-indigo-700';
            case 'violet': return 'bg-violet-100 text-violet-700';
            case 'purple': return 'bg-purple-100 text-purple-700';
            case 'pink': return 'bg-pink-100 text-pink-700';
            default: return 'bg-primary/10 text-primary';
        }
    };

    const renderStep = (step, stepIndex, isBranch = false, totalInFlow = 1) => {
        const hasBranches = step.branches && step.branches.length > 0;

        return (
            <div key={step.id} className={`relative flex flex-col ${isBranch ? 'flex-1' : 'w-full'}`}>
                <div className="relative flex gap-4 group">
                    {/* Connector Line */}
                    {!isBranch && stepIndex < totalInFlow - 1 && (
                        <div className="absolute top-10 bottom-[-1.5rem] left-5 w-0 border-l-2 border-dashed border-border z-0" />
                    )}

                    {/* Node */}
                    <div className={`relative z-10 ${isBranch ? 'size-8' : 'size-10'} border border-border rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${getStepColor(step.color)}`}>
                        {!isBranch ? (
                            <span className="text-sm font-mono font-extrabold tracking-tighter">{(stepIndex + 1).toString().padStart(2, '0')}</span>
                        ) : (
                            <div className="w-2.5 h-2.5 bg-black border border-black" />
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 pt-1 ml-1">
                        <div className="flex items-center gap-2">
                            <h4 className={`${isBranch ? 'text-sm' : 'text-base'} font-semibold text-foreground`}>
                                {step.title}
                            </h4>
                        </div>
                        <p className={`${isBranch ? 'text-xs' : 'text-sm'} text-muted-foreground leading-snug mt-1`}>
                            {step.description}
                        </p>

                        {/* Brutalist Branching UI */}
                        {hasBranches && (
                            <div className="mt-4 pt-6 border-t-[4px] border-dashed border-black relative">
                                <div className="absolute -top-2.5 left-0 bg-background px-2 text-xs font-medium text-muted-foreground border border-border rounded">Branches</div>
                                <div className="flex flex-col sm:flex-row gap-6 mt-2">
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
        <div className="relative p-6 bg-muted/20 border border-border rounded-lg mt-2 mb-2">
            <div className="absolute -top-2.5 right-4 bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-medium rounded-full">
                Flowchart
            </div>
            <div className="relative flex flex-col pt-2">
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
    const { token, isAuthenticated } = useAuth();
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

    // Bookmark state — { section_id, section_title } when present
    const [bookmark, setBookmark] = useState(null);
    const [bookmarkBusy, setBookmarkBusy] = useState(false);
    const [bookmarkRestored, setBookmarkRestored] = useState(false);

    // Define authorIdentifier for use in JSX and effects
    const authorIdentifier = blog?.author?.email || blog?.author_email || blog?.authorUsername || blog?.author?.username || blog?.author?.id;

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
                    
                    // Inject a sample youtube section for demonstration if it's the requested blog
                    if (data.slug === 'distributed-sqlite-at-the-edge' && !normalizedContent.sections.some(s => s.type === 'youtube')) {
                        normalizedContent.sections.push({
                            type: 'youtube',
                            title: 'Video Demonstration',
                            videoId: 'dQw4w9WgXcQ', // Sample Rickroll or any valid ID
                            description: 'A comprehensive video overview of distributed databases.'
                        });
                    }
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

    // 3b. Hydrate has_liked + bookmark from the server when authenticated.
    // The blog endpoint is anonymous + cached, so per-user state comes from
    // a separate /interaction/ call.
    useEffect(() => {
        if (!blog || !isAuthenticated) {
            setBookmark(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await api.getBlogInteraction(blog.slug);
                if (cancelled) return;
                if (typeof data.has_liked === 'boolean') {
                    setIsLikedState(data.has_liked);
                }
                setBookmark(data.bookmark || null);
            } catch (err) {
                console.error('Failed to load blog interaction:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [blog, isAuthenticated]);

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

    // 5b. Reset bookmark-restore guard when navigating between blogs
    useEffect(() => {
        setBookmarkRestored(false);
    }, [slug]);

    // 5c. Auto-scroll to bookmarked section once content is in the DOM
    useEffect(() => {
        if (!blog || !bookmark?.section_id || bookmarkRestored) return;
        if (tableOfContents.length === 0) return;
        // Wait one paint so all section ids are mounted, then scroll.
        const timer = setTimeout(() => {
            const el = document.getElementById(bookmark.section_id);
            if (!el) return;
            const offset = 100;
            window.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' });
            setActiveSection(bookmark.section_id);
            setBookmarkRestored(true);
            toast.success(`Resumed at ${bookmark.section_title || 'your bookmark'}`);
        }, 150);
        return () => clearTimeout(timer);
    }, [blog, bookmark, bookmarkRestored, tableOfContents.length]);

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

    const handleToggleBookmark = async (sectionId, sectionTitle) => {
        if (!blog || bookmarkBusy) return;
        if (!isAuthenticated) {
            toast.error('Please login to bookmark this section');
            return;
        }
        try {
            setBookmarkBusy(true);
            // Re-clicking the same section removes the bookmark; otherwise upsert.
            const isSameSection = bookmark?.section_id === sectionId;
            if (isSameSection) {
                await api.deleteBookmark(blog.slug);
                setBookmark(null);
                toast.success('Bookmark removed');
            } else {
                const saved = await api.saveBookmark(blog.slug, sectionId, sectionTitle || null);
                setBookmark(saved);
                toast.success(`Bookmarked: ${sectionTitle || sectionId}`);
            }
        } catch (err) {
            console.error('Bookmark toggle failed:', err);
            toast.error('Failed to update bookmark');
        } finally {
            setBookmarkBusy(false);
        }
    };

    const handleLike = async () => {
        if (!blog || isLiking) return;

        try {
            if (!isAuthenticated) {
                toast.error('Please login to like this blog');
                return;
            }

            setIsLiking(true);
            const response = await api.likeBlog(blog.slug);

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

    const renderParagraphBlock = (section, index, headingOnly = false) => (
        <div key={index} id={`section-${index}`} className="mb-10">
            {section.title && (
                <h3 className="text-xl font-semibold text-foreground mb-4">
                    {section.title}
                </h3>
            )}
            {!headingOnly && section.content && (
                <p className="text-foreground/90 text-base leading-relaxed whitespace-pre-wrap">
                    {section.content}
                </p>
            )}
        </div>
    );

    const renderListItems = (section) => {
        const items = Array.isArray(section.items)
            ? section.items
            : Array.isArray(section.content)
                ? section.content
                : [];
        return items.map((item) => typeof item === 'string' ? item : item?.text || JSON.stringify(item));
    };

    const normaliseTable = (section) => {
        if (section.headers && section.rows) return { headers: section.headers, rows: section.rows };
        if (!Array.isArray(section.content) || section.content.length === 0) return { headers: [], rows: [] };
        const headers = Object.keys(section.content[0]);
        const rows = section.content.map((row) => headers.map((header) => row?.[header] ?? ''));
        return { headers, rows };
    };

    const renderSection = (section, index) => {
        switch (section.type) {
            case 'heading':
                return renderParagraphBlock(section, index, false);
            case 'paragraph':
            case 'text':
                return renderParagraphBlock(section, index);

            case 'list':
            case 'bullets':
                const listItems = renderListItems(section);
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                        )}
                        <ul className="space-y-3">
                            {listItems.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                                    <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <span className="text-foreground/90 text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );

            case 'table':
                const tableData = normaliseTable(section);
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                        )}
                        <div className="overflow-x-auto border border-border rounded-lg">
                            <table className="min-w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        {tableData.headers.map((header, headerIndex) => (
                                            <th key={headerIndex} className="px-4 py-3 text-left font-medium text-foreground text-sm border-r border-border last:border-r-0">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {tableData.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-muted/40 transition-colors">
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} className="px-4 py-3 text-sm text-foreground/90 border-r border-border last:border-r-0">
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

            case 'quote':
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                        )}
                        <blockquote className="border-l-4 border-primary bg-primary/5 rounded-r-lg p-5 text-lg font-medium text-foreground leading-relaxed italic">
                            {section.content}
                        </blockquote>
                    </div>
                );

            case 'note':
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                        )}
                        <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-5 relative">
                            <AlertCircle className="absolute right-4 top-4 size-5 text-primary" />
                            <div>
                                <span className="inline-block bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium mb-3">
                                    Important Note
                                </span>
                                <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap pr-8">
                                    {section.content}
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'links':
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                        )}
                        <div className="grid gap-6 sm:grid-cols-2">
                            {section.links?.map((link, linkIndex) => (
                                <a
                                    key={linkIndex}
                                    href={normalizeReferenceUrl(link.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex bg-card border border-border rounded-lg hover:border-primary/40 hover:shadow-md transition-all overflow-hidden"
                                >
                                    <div className="p-4 flex-1 flex flex-col justify-center">
                                        <h4 className="font-medium text-base text-primary group-hover:underline underline-offset-2 mb-1">
                                            {link.text}
                                        </h4>
                                        <p className="text-muted-foreground text-sm">
                                            {link.description}
                                        </p>
                                    </div>
                                    <div className="w-12 border-l border-border flex items-center justify-center bg-muted shrink-0">
                                        <ExternalLink className="size-4 text-muted-foreground" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                );

            case 'image':
                const sectionImage = section.attachment || section.url || section.imageUrl || section.content;
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                        )}
                        {sectionImage && (
                            <div className="border border-border rounded-lg overflow-hidden">
                                <Image
                                    src={getImageUrl(sectionImage)}
                                    alt={section.attachment?.filename || section.title || 'Section image'}
                                    width={1200}
                                    height={675}
                                    sizes="(min-width: 1024px) 896px, 100vw"
                                    className="w-full h-auto object-cover"
                                />
                                {(section.caption || section.description) && (
                                    <div className="px-4 py-2 bg-muted border-t border-border">
                                        <p className="text-xs text-muted-foreground text-center">
                                            {section.caption || section.description}
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
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                        )}
                        <div className="relative group border border-border rounded-lg overflow-hidden bg-[#1e1e1e]">
                            {/* Code header */}
                            <div className="bg-[#161616] border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-white/60 text-xs font-mono">
                                        {section.language}
                                    </span>
                                </div>
                                <button
                                    onClick={() => copyCode(formatCode(section.content), codeIndex)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-all"
                                    title="Copy code"
                                >
                                    {isCopied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>COPIED!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>COPY</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Code block */}
                            <div className="bg-[#1e1e1e] overflow-hidden pt-4 pb-2">
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
                                        lineHeight: '1.6',
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
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                                {section.title}
                            </h3>
                        )}
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="aspect-video relative bg-black">
                                <iframe
                                    src={`https://www.youtube.com/embed/${section.videoId}`}
                                    title={section.videoTitle || section.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full absolute inset-0"
                                />
                            </div>
                            {section.description && (
                                <div className="px-4 py-2 bg-muted border-t border-border">
                                    <p className="text-muted-foreground text-sm text-center">{section.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'flowchart':
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
                                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary rounded-md p-1 shrink-0">
                                        <GitBranch className="size-4" />
                                    </span>
                                    {section.title}
                                </h3>
                                <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">Flow</span>
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
                <div className="flex items-center justify-center gap-3 bg-card border border-border rounded-md px-6 py-4 shadow-sm">
                    <span className="size-5 border-2 border-border border-t-primary rounded-full animate-spin"></span>
                    <span className="text-muted-foreground text-sm">Loading…</span>
                </div>
            </div>
        );
    }

    if (isError || !blog) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="bg-card border border-border rounded-xl p-12 text-center max-w-lg w-full shadow-lg">
                    <h1 className="text-2xl font-bold text-foreground mb-3">Blog not found</h1>
                    <p className="text-muted-foreground text-sm mb-8">The requested blog post doesn&apos;t exist or is unavailable.</p>
                    <Link href="/blogs" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                        <ArrowLeft className="size-4" />
                        Back to Blogs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 relative bg-transparent">
            <div className="flex justify-center relative z-10">
                {/* TOC Button - Fixed on Left */}
                {tableOfContents.length > 0 && (
                    <button
                        onClick={() => setShowTOC(true)}
                        className="fixed bottom-6 left-6 z-40 bg-card border border-border rounded-lg hover:bg-muted text-foreground px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Menu className="size-4" />
                        <span className="hidden md:inline">Contents</span>
                    </button>
                )}

                {/* TOC Sheet Overlay */}
                {showTOC && (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowTOC(false)}>
                        <div
                            className="absolute left-0 top-0 bottom-0 w-full sm:w-80 bg-card border-r border-border overflow-y-auto shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
                                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                        <Menu className="size-4" />
                                        Contents
                                    </h3>
                                    <button
                                        onClick={() => setShowTOC(false)}
                                        className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {bookmark?.section_id && (
                                    <div className="mb-4 p-3 border border-primary/30 bg-primary/5 rounded-md flex items-center gap-2">
                                        <BookmarkCheck className="size-4 text-primary shrink-0" />
                                        <span className="text-xs text-primary truncate">
                                            Saved: {bookmark.section_title || bookmark.section_id}
                                        </span>
                                    </div>
                                )}
                                <nav className="space-y-1">
                                    {tableOfContents.map((item, index) => {
                                        const isActive = activeSection === item.id;
                                        const isBookmarked = bookmark?.section_id === item.id;
                                        return (
                                            <div key={item.id} className={`flex items-stretch rounded-md transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                                                <button
                                                    onClick={() => scrollToSection(item.id)}
                                                    className={`flex-1 text-left px-3 py-2 text-sm ${isActive ? 'text-primary font-medium' : 'text-foreground'}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-xs text-muted-foreground mt-0.5 shrink-0 font-mono">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </span>
                                                        <span className="flex-1">{item.title}</span>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleBookmark(item.id, item.title)}
                                                    disabled={bookmarkBusy}
                                                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark this section'}
                                                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this section'}
                                                    className={`px-2 flex items-center justify-center rounded-r-md transition-colors disabled:opacity-50 ${isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    {isBookmarked ? <BookmarkCheck className="size-4 fill-current" /> : <Bookmark className="size-4" />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Wrapper */}
                <div className="w-full max-w-5xl px-4 mx-auto pb-20">
                    {/* Back Button Outside Container */}
                    <button
                        onClick={() => {
                            if (typeof window !== 'undefined' && window.history.length > 1) {
                                router.back();
                            } else {
                                router.push('/blogs');
                            }
                        }}
                        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </button>

                    {/* Main Blog Container */}
                    <article className="bg-card border border-border rounded-xl relative z-10 flex flex-col overflow-hidden shadow-sm">
                        {/* Featured Image */}
                        <div className="relative h-96 w-full bg-muted">
                            {(blog.thumbnail || blog.image) ? (
                                <Image
                                    src={getImageUrl(blog.thumbnail || blog.image)}
                                    alt={blog.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                    <p className="text-sm">No image</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10 z-10">
                                <div className="max-w-3xl">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="bg-primary/90 text-primary-foreground rounded-full px-3 py-0.5 text-xs font-medium backdrop-blur-sm">
                                            {blog.category_name || (blog.category ? (typeof blog.category === 'object' ? blog.category.name : blog.category) : 'General')}
                                        </span>
                                        {blog.featured && (
                                            <span className="bg-amber-500/90 text-white rounded-full px-3 py-0.5 text-xs font-medium">Featured</span>
                                        )}
                                    </div>
                                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight text-white">
                                        {blog.title}
                                    </h1>
                                    {(blog.subtitle || blog.description || blog.excerpt) && (
                                        <p className="text-sm text-white/80 leading-relaxed">
                                            {blog.subtitle || blog.description || blog.excerpt}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Meta Information Bar */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 border-b border-border">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                <Calendar className="size-4" />
                                <span>{formatDate(getBlogDate(blog), "Date")}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                <User className="size-4" />
                                <Link href={authorIdentifier ? `/blogs/${encodeURIComponent(authorIdentifier)}` : `/blogs`}>
                                    <span className="cursor-pointer hover:text-foreground hover:underline underline-offset-2 transition-colors">
                                        {typeof blog.author === 'object' ? (blog.author.full_name || blog.author_email || blog.author.username || blog.authorUsername) : blog.author}
                                    </span>
                                </Link>
                            </div>
                            {blog.views !== undefined && (
                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                    <Eye className="size-4" />
                                    <span>{blog.views.toLocaleString()}</span>
                                </div>
                            )}
                            {likesCount !== undefined && (
                                <button
                                    onClick={handleLike}
                                    disabled={isLiking}
                                    className={`flex items-center gap-1.5 text-sm transition-colors ${isLikedState ? 'text-primary' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-50`}
                                    title="Like this blog"
                                >
                                    <Heart className={`size-4 transition-all ${isLikedState ? 'fill-current' : ''} ${isLiking ? 'animate-pulse' : ''}`} />
                                    <span>{likesCount.toLocaleString()}</span>
                                </button>
                            )}
                        </div>

                        {/* Tags */}
                        {blog.tags && blog.tags.length > 0 && (
                            <div className="px-6 pt-5 pb-2 border-b border-border flex flex-wrap gap-2">
                                {blog.tags.map((tag, index) => (
                                    <span key={index} className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Article Content Wrapper */}
                        <div className="p-8 md:p-12">

                            {/* Introduction */}
                            {blog.content?.introduction && (
                                <div id="introduction" className="mb-10">
                                    <h3 className="text-xl font-semibold text-foreground mb-4">Introduction</h3>
                                    <p className="text-foreground/90 text-base leading-relaxed whitespace-pre-wrap">
                                        {blog.content.introduction}
                                    </p>
                                </div>
                            )}

                            {/* Dynamic Sections */}
                            {blog.content?.sections?.map((section, index) => renderSection(section, index))}

                            {/* Conclusion */}
                            {blog.content?.conclusion && (
                                <div id="conclusion" className="mt-12 pt-10 border-t border-border">
                                    <h3 className="text-xl font-semibold text-foreground mb-4">Conclusion</h3>
                                    <p className="text-foreground/90 text-base leading-relaxed whitespace-pre-wrap">
                                        {blog.content.conclusion}
                                    </p>
                                </div>
                            )}
                        </div>
                    </article>

                    {/* Related Blogs Section */}
                    {suggestedBlogs.length > 0 && (
                        <div className="mt-16">
                            <h2 className="text-xl font-bold text-foreground mb-6">Related Posts</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {suggestedBlogs.map((item, idx) => (
                                    <Link
                                        key={idx}
                                        href={`/blogs/${encodeURIComponent(item.author?.email || item.author_email || item.authorUsername || item.author?.username || item.author?.id || 'unknown')}/${item.slug}`}
                                        className="group flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-md transition-all h-full"
                                    >
                                        <div className="relative aspect-video overflow-hidden bg-muted">
                                            {(item.thumbnail || item.image) ? (
                                                <Image
                                                    src={getImageUrl(item.thumbnail || item.image)}
                                                    alt={item.title}
                                                    fill
                                                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                                    <p className="text-xs">No image</p>
                                                </div>
                                            )}
                                            {(item.category_name || item.category) && (
                                                <div className="absolute top-2 left-2">
                                                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                                                        {item.category_name || (typeof item.category === 'object' ? item.category?.name : item.category)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col">
                                            <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                                            {item.excerpt && (
                                                <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed mt-auto">{item.excerpt}</p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
