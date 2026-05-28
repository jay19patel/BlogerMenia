'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, AlertCircle, Copy, Check, Menu, ArrowLeft, Calendar, User, Eye, Heart, ArrowRight, ArrowDown, Layers, Zap, Cloud, Cpu, Database, RefreshCw, GitBranch } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api } from '@/lib/api';
import { getBlogDate, getImageUrl, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';

const Flowchart = ({ section }) => {
    const getStepColor = (color) => {
        switch (color) {
            case 'blue': return 'bg-blue-300 text-black';
            case 'indigo': return 'bg-indigo-300 text-black';
            case 'violet': return 'bg-violet-300 text-black';
            case 'purple': return 'bg-purple-300 text-black';
            case 'pink': return 'bg-pink-300 text-black';
            default: return 'bg-yellow-300 text-black';
        }
    };

    const renderStep = (step, stepIndex, isBranch = false, totalInFlow = 1) => {
        const hasBranches = step.branches && step.branches.length > 0;

        return (
            <div key={step.id} className={`relative flex flex-col ${isBranch ? 'flex-1' : 'w-full'}`}>
                <div className="relative flex gap-4 group">
                    {/* Brutalist Connector Line (Dashed) */}
                    {!isBranch && stepIndex < totalInFlow - 1 && (
                        <div className="absolute top-10 bottom-[-1.5rem] left-5 w-0 border-l-[4px] border-dashed border-black z-0" />
                    )}

                    {/* Node - Neo-brutalist Square */}
                    <div className={`relative z-10 ${isBranch ? 'w-8 h-8' : 'w-10 h-10'} border-[3px] border-black flex items-center justify-center shrink-0 transition-all duration-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${getStepColor(step.color)}`}>
                        {!isBranch ? (
                            <span className="text-sm font-mono font-extrabold tracking-tighter">{(stepIndex + 1).toString().padStart(2, '0')}</span>
                        ) : (
                            <div className="w-2.5 h-2.5 bg-black border border-black" />
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 pt-1 ml-1">
                        <div className="flex items-center gap-2">
                            <h4 className={`${isBranch ? 'text-[14px]' : 'text-base'} font-extrabold text-black uppercase tracking-tight group-hover:underline decoration-[2px] underline-offset-2`}>
                                {step.title}
                            </h4>
                        </div>
                        <p className={`${isBranch ? 'text-[12px]' : 'text-[14px]'} text-black leading-snug mt-1 font-mono font-medium opacity-90`}>
                            {step.description}
                        </p>

                        {/* Brutalist Branching UI */}
                        {hasBranches && (
                            <div className="mt-4 pt-6 border-t-[4px] border-dashed border-black relative">
                                <div className="absolute top-[-10px] left-0 bg-white px-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black border-[2px] border-black">BRANCHES</div>
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
        <div className="relative p-6 bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mt-2 mb-2">
            <div className="absolute top-[-14px] right-4 bg-purple-900 px-3 py-1 font-mono text-[10px] text-white font-bold uppercase tracking-widest border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                FLOWCHART
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

    const renderParagraphBlock = (section, index, headingOnly = false) => (
        <div key={index} id={`section-${index}`} className="mb-12">
            {section.title && (
                <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
                    {section.title}
                </h3>
            )}
            {!headingOnly && section.content && (
                <p className="text-black text-base leading-relaxed whitespace-pre-wrap font-medium">
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
                            <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
                                {section.title}
                            </h3>
                        )}
                        <ul className="space-y-4">
                            {listItems.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start gap-4 p-4 border-[4px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                                    <div className="w-3 h-3 bg-purple-900 border-[2px] border-black mt-1.5 flex-shrink-0" />
                                    <span className="text-black font-bold text-base">{item}</span>
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
                            <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
                                {section.title}
                            </h3>
                        )}
                        <div className="overflow-x-auto border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                            <table className="min-w-full">
                                <thead className="bg-gray-100 text-black border-b-[4px] border-black">
                                    <tr>
                                        {tableData.headers.map((header, headerIndex) => (
                                            <th
                                                key={headerIndex}
                                                className="px-6 py-4 text-left font-mono font-bold uppercase tracking-widest text-sm border-r-[4px] border-black last:border-r-0"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y-[2px] divide-black bg-white">
                                    {tableData.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                                            {row.map((cell, cellIndex) => (
                                                <td
                                                    key={cellIndex}
                                                    className="px-6 py-4 whitespace-nowrap font-medium text-sm text-black border-r-[4px] border-black last:border-r-0"
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

            case 'quote':
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
                                {section.title}
                            </h3>
                        )}
                        <blockquote className="border-l-[8px] border-purple-900 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xl font-extrabold text-black leading-relaxed">
                            {section.content}
                        </blockquote>
                    </div>
                );

            case 'note':
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
                                {section.title}
                            </h3>
                        )}
                        <div className="bg-yellow-100 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative group">
                            <AlertCircle className="absolute right-4 top-4 w-6 h-6 text-yellow-600 z-10" />
                            <div className="relative z-10">
                                <span className="inline-block px-3 py-1 bg-black text-yellow-100 font-mono font-bold uppercase tracking-widest text-xs mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-[2px] border-black">
                                    IMPORTANT NOTE
                                </span>
                                <p className="text-black font-extrabold text-lg leading-relaxed whitespace-pre-wrap pr-8">
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
                            <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
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
                                    className="group flex border-[4px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all relative overflow-hidden"
                                >
                                    <div className="p-5 flex-1 flex flex-col justify-center">
                                        <h4 className="font-extrabold text-lg text-blue-700 uppercase tracking-tight underline group-hover:text-blue-800 mb-1">
                                            {link.text}
                                        </h4>
                                        <p className="text-black font-medium text-sm">
                                            {link.description}
                                        </p>
                                    </div>
                                    <div className="w-16 border-l-[4px] border-black flex items-center justify-center bg-gray-50 group-hover:bg-gray-200 transition-colors shrink-0">
                                        <ExternalLink className="w-5 h-5 text-black" />
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
                            <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
                                {section.title}
                            </h3>
                        )}
                        {sectionImage && (
                            <div className="border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden p-2">
                                <div className="border-[4px] border-black relative group">
                                    <Image
                                        src={getImageUrl(sectionImage)}
                                        alt={section.attachment?.filename || section.title || 'Section image'}
                                        width={1200}
                                        height={675}
                                        sizes="(min-width: 1024px) 896px, 100vw"
                                        className="w-full h-auto object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
                                    />
                                </div>
                                {section.caption && (
                                    <div className="mt-4 p-4 bg-black text-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <p className="font-mono font-bold uppercase tracking-widest text-xs text-center">
                                            {section.caption}
                                        </p>
                                    </div>
                                )}
                                {section.description && !section.caption && (
                                    <div className="mt-4 p-4 bg-black text-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <p className="font-mono font-bold uppercase tracking-widest text-xs text-center">
                                            {section.description}
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
                            <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
                                {section.title}
                            </h3>
                        )}
                        <div className="relative group border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[#1e1e1e]">
                            {/* Code header */}
                            <div className="bg-black border-b-[4px] border-black px-4 py-3 flex items-center justify-between z-10">
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-xs font-mono font-bold uppercase tracking-widest bg-[#1e1e1e] px-3 py-1 border-[2px] border-white">
                                        {section.language}
                                    </span>
                                </div>
                                <button
                                    onClick={() => copyCode(formatCode(section.content), codeIndex)}
                                    className="flex items-center gap-2 px-3 py-1 bg-white text-black border-[2px] border-transparent hover:border-black hover:bg-yellow-200 hover:text-black text-xs font-mono font-bold uppercase transition-all shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
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
                            <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter mb-4 border-b-[4px] border-black pb-2 inline-block">
                                {section.title}
                            </h3>
                        )}
                        <div className="border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white p-2">
                            <div className="aspect-video border-[4px] border-black relative bg-black">
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
                                <div className="mt-4 p-4 border-[4px] border-dashed border-black bg-gray-50">
                                    <p className="font-bold text-black text-center font-mono text-sm uppercase tracking-wider">
                                        {section.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'flowchart':
                return (
                    <div key={index} id={`section-${index}`} className="mb-12">
                        {section.title && (
                            <div className="flex items-center justify-between mb-6 border-b-[4px] border-black pb-2">
                                <h3 className="text-2xl font-extrabold text-black uppercase tracking-tighter flex items-center gap-3">
                                    <span className="w-7 h-7 bg-purple-900 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center shrink-0">
                                        <GitBranch className="w-4 h-4 text-white" />
                                    </span>
                                    {section.title}
                                </h3>
                                <span className="font-mono font-bold uppercase tracking-widest text-white bg-black px-2 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-[2px] border-black text-[10px]">Interactive Flow</span>
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
        <div className="min-h-screen py-12 relative bg-transparent">
            <div className="flex justify-center relative z-10">
                {/* TOC Button - Fixed on Left */}
                {tableOfContents.length > 0 && (
                    <button
                        onClick={() => setShowTOC(true)}
                        className="fixed bottom-6 left-6 z-40 bg-white border-[4px] border-black hover:bg-gray-100 text-black px-5 py-2 font-mono font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1"
                    >
                        <Menu className="w-5 h-5" />
                        <span className="hidden md:inline">TOC</span>
                    </button>
                )}

                {/* TOC Sheet Overlay */}
                {showTOC && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowTOC(false)}>
                        <div
                            className="absolute left-0 top-0 bottom-0 w-full sm:w-96 bg-white border-r-[4px] border-black overflow-y-auto transform transition-transform duration-300 ease-out shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b-[4px] border-black">
                                    <h3 className="text-2xl font-extrabold text-black flex items-center gap-2 uppercase tracking-tighter">
                                        <Menu className="w-6 h-6 text-black" />
                                        Index
                                    </h3>
                                    <button
                                        onClick={() => setShowTOC(false)}
                                        className="p-2 hover:bg-gray-100 transition-colors border-[4px] border-transparent hover:border-black"
                                    >
                                        <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <nav className="space-y-4">
                                    {tableOfContents.map((item, index) => (
                                        <button
                                            key={item.id}
                                            onClick={() => scrollToSection(item.id)}
                                            className={`w-full text-left px-4 py-3 text-sm transition-all duration-300 border-[4px] ${activeSection === item.id
                                                ? 'bg-black text-white border-black font-bold shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] translate-y-[-2px]'
                                                : 'text-black border-black bg-white hover:bg-gray-50 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`text-xs font-mono mt-0.5 flex-shrink-0 ${activeSection === item.id ? 'text-gray-300' : 'text-gray-500'}`}>
                                                    {(index + 1).toString().padStart(2, '0')}
                                                </span>
                                                <span className="flex-1 uppercase tracking-tight">{item.title}</span>
                                            </div>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Wrapper */}
                <div className="w-full max-w-5xl px-4 mx-auto pb-20">
                    {/* Back Button Outside Container */}
                    <Link
                        href={backUrl}
                        className="inline-flex items-center gap-2 font-mono font-bold uppercase tracking-widest text-black hover:text-purple-900 mb-6 transition-all hover:translate-x-[-4px]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        RETURN
                    </Link>

                    {/* Main Blog Container */}
                    <article className="bg-white border-[4px] border-black relative z-10 flex flex-col">
                        {/* Featured Image */}
                        <div className="relative h-[450px] w-full border-b-[4px] border-black bg-black">
                            {(blog.thumbnail || blog.image) ? (
                                <Image
                                    src={getImageUrl(blog.thumbnail || blog.image)}
                                    alt={blog.title}
                                    fill
                                    className="object-cover grayscale-[40%] opacity-80"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-black flex items-center justify-center text-white">
                                    <p className="text-6xl font-mono font-bold uppercase tracking-widest opacity-50">SYS.NO_IMG</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                            {/* Overlay Content */}
                            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 z-20">
                                <div className="max-w-4xl">
                                    <div className="flex flex-wrap gap-3 mb-6">
                                        <span className="px-3 py-1 bg-white text-black text-[10px] uppercase font-mono font-bold tracking-widest border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                            {blog.category_name || (blog.category ? (typeof blog.category === 'object' ? blog.category.name : blog.category) : 'General')}
                                        </span>
                                        {blog.featured && (
                                            <span className="px-3 py-1 bg-purple-900 text-white text-[10px] uppercase font-mono font-bold tracking-widest border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                FEATURED
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 uppercase tracking-tighter leading-[1.1] text-white">
                                        {blog.title}
                                    </h1>
                                    {(blog.subtitle || blog.description || blog.excerpt) && (
                                        <p className="text-sm font-mono text-gray-200 uppercase tracking-widest leading-relaxed">
                                            {blog.subtitle || blog.description || blog.excerpt}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Meta Information Bar */}
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6 border-b-[4px] border-black bg-white">
                            <div className="flex items-center gap-2 text-black font-mono uppercase text-xs font-bold tracking-widest">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(getBlogDate(blog), "Date")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-black font-mono uppercase text-xs font-bold tracking-widest">
                                <User className="w-4 h-4" />
                                <Link href={authorIdentifier ? `/blogs/${encodeURIComponent(authorIdentifier)}` : `/blogs`}>
                                    <span className="cursor-pointer hover:underline hover:text-purple-900 transition-colors">
                                        {typeof blog.author === 'object' ? (blog.author.full_name || blog.author_email || blog.author.username || blog.authorUsername) : blog.author}
                                    </span>
                                </Link>
                            </div>
                            {blog.views !== undefined && (
                                <div className="flex items-center gap-2 text-black font-mono uppercase text-xs font-bold tracking-widest">
                                    <Eye className="w-4 h-4" />
                                    <span>{blog.views.toLocaleString()}</span>
                                </div>
                            )}
                            {likesCount !== undefined && (
                                <button
                                    onClick={handleLike}
                                    disabled={isLiking}
                                    className={`flex items-center gap-2 font-mono uppercase text-xs font-bold tracking-widest transition-all duration-300 ${isLikedState
                                        ? 'text-purple-900 hover:text-purple-700'
                                        : 'text-black hover:text-purple-900'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title="Like this blog"
                                >
                                    <Heart
                                        className={`w-4 h-4 transition-all duration-300 ${isLikedState ? 'fill-current' : ''
                                            } ${isLiking ? 'animate-pulse' : ''}`}
                                    />
                                    <span>{likesCount.toLocaleString()}</span>
                                </button>
                            )}
                        </div>

                        {/* Tags (if any) */}
                        {blog.tags && blog.tags.length > 0 && (
                            <div className="px-8 md:px-12 pt-8 pb-4 bg-white border-b-[4px] border-black flex flex-wrap gap-3">
                                {blog.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-black text-white text-[10px] font-mono font-bold uppercase tracking-widest"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Article Content Wrapper */}
                        <div className="p-8 md:p-16 bg-white">
                            
                            {/* Introduction */}
                            {blog.content?.introduction && (
                                <div id="introduction" className="mb-12">
                                    <h3 className="text-3xl font-extrabold text-black uppercase tracking-tighter mb-6 border-b-[4px] border-black pb-2 inline-block">
                                        INTRODUCTION
                                    </h3>
                                    <p className="text-black text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                        {blog.content.introduction}
                                    </p>
                                </div>
                            )}

                            {/* Dynamic Sections */}
                            {blog.content?.sections?.map((section, index) => renderSection(section, index))}

                            {/* Conclusion */}
                            {blog.content?.conclusion && (
                                <div id="conclusion" className="mt-16 pt-12 border-t-[4px] border-black">
                                    <h3 className="text-3xl font-extrabold text-black uppercase tracking-tighter mb-6 border-b-[4px] border-black pb-2 inline-block">
                                        CONCLUSION
                                    </h3>
                                    <p className="text-black text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                        {blog.content.conclusion}
                                    </p>
                                </div>
                            )}
                        </div>
                    </article>

                    {/* Related Blogs Section */}
                    {suggestedBlogs.length > 0 && (
                        <div className="mt-20">
                            <h2 className="text-4xl font-extrabold mb-8 text-black uppercase tracking-tighter border-b-[4px] border-black pb-4 inline-block">RELATED QUERIES</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {suggestedBlogs.map((item, idx) => (
                                    <Link 
                                        key={idx} 
                                        href={`/blogs/${encodeURIComponent(item.author?.email || item.author_email || item.authorUsername || item.author?.username || item.author?.id || 'unknown')}/${item.slug}`}
                                        className="group block bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex flex-col h-full overflow-hidden"
                                    >
                                        <div className="relative aspect-video overflow-hidden bg-purple-50 border-b-2 border-black">
                                            {(item.thumbnail || item.image) ? (
                                                <Image
                                                    src={getImageUrl(item.thumbnail || item.image)}
                                                    alt={item.title}
                                                    fill
                                                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                                                    className="object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                                                    <p className="text-purple-900 text-[10px] font-mono font-bold uppercase tracking-widest opacity-50">Sys-Log</p>
                                                </div>
                                            )}
                                            {(item.category_name || item.category) && (
                                                <div className="absolute top-2 left-2">
                                                    <span className="inline-flex items-center px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest bg-white text-black border-2 border-black">
                                                        {item.category_name || (typeof item.category === 'object' ? item.category?.name : item.category)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h3 className="text-lg font-extrabold text-black mb-3 line-clamp-2 uppercase tracking-tight group-hover:text-purple-900 transition-colors">{item.title}</h3>
                                            {item.excerpt && (
                                                <p className="text-black font-medium text-sm line-clamp-2 leading-relaxed mt-auto opacity-80">{item.excerpt}</p>
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
