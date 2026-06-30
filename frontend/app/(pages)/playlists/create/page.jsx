'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
    ArrowLeft,
    Save,
    Trash2,
    Plus,
    Upload,
    Search,
    Loader2,
    BookOpen,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { formatDate, getImageUrl } from '@/lib/utils';

export default function CreatePlaylistPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading } = useAuth();

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [slug, setSlug] = useState('');
    const [autoSlug, setAutoSlug] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Selected Blogs State
    const [selectedBlogs, setSelectedBlogs] = useState([]);

    // Search/Available Blogs State
    const [availableBlogs, setAvailableBlogs] = useState([]);
    const [loadingBlogs, setLoadingBlogs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalBlogs, setTotalBlogs] = useState(0);
    const BLOGS_PER_PAGE = 5;

    // Redirect unauthenticated users to login
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
    }, [isAuthenticated, loading, router]);

    const generateSlug = (text) => {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    useEffect(() => {
        if (autoSlug && name) {
            setSlug(generateSlug(name));
        }
    }, [name, autoSlug]);

    const getBlogId = (blog) => blog.id || blog._id?.toString?.() || String(blog._id);

    const fetchAvailableBlogs = useCallback(async () => {
        if (!isAuthenticated || !user) return;
        const userId = user.id || user._id;
        if (!userId) return;

        try {
            setLoadingBlogs(true);
            const skip = (currentPage - 1) * BLOGS_PER_PAGE;
            const data = await api.getMyBlogs(null, userId, searchQuery || null, skip, BLOGS_PER_PAGE);

            const selectedIds = new Set(selectedBlogs.map(getBlogId));
            const mapped = (data?.blogs || []).map(blog => ({
                ...blog,
                id: getBlogId(blog),
                isAdded: selectedIds.has(getBlogId(blog)),
            }));

            setAvailableBlogs(mapped);
            setTotalBlogs(data?.total || 0);
        } catch (error) {
            console.error('Error fetching available blogs:', error);
            toast.error('Failed to load your blogs');
        } finally {
            setLoadingBlogs(false);
        }
    }, [isAuthenticated, user, searchQuery, currentPage, selectedBlogs]);

    useEffect(() => {
        if (isAuthenticated && user) fetchAvailableBlogs();
    }, [fetchAvailableBlogs]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const toggleSelectBlog = (blog) => {
        const blogId = getBlogId(blog);
        const normalised = { ...blog, id: blogId };
        if (selectedBlogs.some(b => getBlogId(b) === blogId)) {
            setSelectedBlogs(prev => prev.filter(b => getBlogId(b) !== blogId));
        } else {
            setSelectedBlogs(prev => [...prev, normalised]);
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Playlist name is required');
            return;
        }

        try {
            setIsSubmitting(true);

            let coverImage = '';
            if (imageFile) {
                const uploadRes = await api.uploadImage(imageFile, 'playlists', null);
                coverImage = uploadRes.file_path || uploadRes.url || '';
            }

            const playlistData = {
                name: name.trim(),
                slug: slug.trim() || generateSlug(name),
                description: description.trim(),
                cover_image: coverImage,
                is_public: isPublic,
                blogs: selectedBlogs.map(getBlogId).filter(Boolean),
            };

            const result = await api.createPlaylist(playlistData, null);

            toast.success('Playlist created successfully!');
            const ownerIdentifier = user?.username || user?.email?.split('@')[0] || user?.email;
            router.push(`/playlists/${ownerIdentifier}/${result.slug || result._id?.toString()}`);
        } catch (error) {
            console.error('Error creating playlist:', error);
            toast.error(error.message || 'Failed to create playlist');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || (!isAuthenticated && !loading)) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm flex items-center gap-3">
                    <span className="size-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/my-blogs" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
                        <ArrowLeft className="size-4" />Back to My Blogs
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <span className="bg-primary/10 text-primary rounded-lg p-2"><Plus className="size-6" /></span>
                        Create Playlist
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Details */}
                    <div className="lg:col-span-4">
                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden sticky top-8 p-6">
                            <h2 className="text-base font-semibold text-foreground mb-5 pb-4 border-b border-border">Playlist Details</h2>
                            <form onSubmit={handleCreatePlaylist} className="space-y-5">
                                {/* Cover Image */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Cover Image</label>
                                    <div onClick={() => document.getElementById('playlist-image-upload').click()} className="relative overflow-hidden mb-3 aspect-video bg-muted border border-border rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt="Preview" fill sizes="100vw" className="object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-xs text-muted-foreground">Click to upload</p>
                                            </div>
                                        )}
                                    </div>
                                    <input id="playlist-image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Title <span className="text-destructive">*</span></label>
                                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Python Tutorials" className="w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm placeholder:text-muted-foreground text-foreground" />
                                </div>

                                {/* Slug */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-sm font-medium text-foreground">URL Slug</label>
                                        <button type="button" onClick={() => setAutoSlug(!autoSlug)} className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${autoSlug ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                            {autoSlug ? 'Auto' : 'Manual'}
                                        </button>
                                    </div>
                                    <input type="text" value={slug} onChange={(e) => { setSlug(generateSlug(e.target.value)); setAutoSlug(false); }} disabled={autoSlug} placeholder="playlist-url-slug" className="w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm font-mono text-muted-foreground disabled:opacity-60" />
                                    {autoSlug && name && (
                                        <p className="text-xs text-muted-foreground mt-1.5 font-mono truncate">
                                            /playlists/{user?.username || user?.email?.split('@')[0]}/<span className="text-primary">{slug}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this playlist about?" className="w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none text-sm placeholder:text-muted-foreground text-foreground" />
                                </div>

                                {/* Visibility */}
                                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Visibility</p>
                                        <p className="text-xs text-muted-foreground">{isPublic ? 'Public' : 'Private'}</p>
                                    </div>
                                    <button type="button" onClick={() => setIsPublic(!isPublic)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPublic ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                                        <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>

                                <button type="submit" disabled={isSubmitting || !name.trim()} className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                    {isSubmitting ? 'Creating...' : 'Save Playlist'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Blog Selection */}
                    <div className="lg:col-span-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                            {/* Selected Blogs */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                                        Included <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">{selectedBlogs.length}</span>
                                    </h2>
                                </div>
                                <div className="space-y-2 max-h-175 overflow-y-auto min-h-50">
                                    {selectedBlogs.length > 0 ? (
                                        selectedBlogs.map((blog, idx) => (
                                            <div key={getBlogId(blog)} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
                                                <div className="relative size-12 rounded-md overflow-hidden bg-muted shrink-0">
                                                    <Image src={getImageUrl(blog.thumbnail)} fill sizes="48px" className="object-cover" alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-muted-foreground mb-0.5">#{idx + 1}</p>
                                                    <h4 className="text-sm font-medium text-foreground truncate">{blog.title}</h4>
                                                </div>
                                                <button type="button" onClick={() => toggleSelectBlog(blog)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Remove">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed border-border">
                                            <BookOpen className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                                            <p className="text-sm text-muted-foreground">Select blogs from the right to add them.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Available Blogs */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-semibold text-foreground">Add Blogs <span className="text-muted-foreground text-sm font-normal">({totalBlogs})</span></h2>
                                </div>
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <input type="text" placeholder="Search your blogs..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm placeholder:text-muted-foreground" />
                                </div>

                                <div className="space-y-2 min-h-75">
                                    {loadingBlogs ? (
                                        [...Array(5)].map((_, i) => (
                                            <div key={i} className="animate-pulse bg-muted rounded-lg p-3 flex items-center gap-3">
                                                <div className="size-12 rounded-md bg-muted-foreground/20" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-muted-foreground/20 rounded w-2/3" />
                                                    <div className="h-2.5 bg-muted-foreground/20 rounded w-1/3" />
                                                </div>
                                            </div>
                                        ))
                                    ) : availableBlogs.length > 0 ? (
                                        availableBlogs.map((blog) => (
                                            <div key={getBlogId(blog)} onClick={() => toggleSelectBlog(blog)} className={`p-3 rounded-lg border transition-all flex items-center gap-3 cursor-pointer ${blog.isAdded ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40'}`}>
                                                <div className="relative size-12 rounded-md overflow-hidden bg-muted shrink-0">
                                                    <Image src={getImageUrl(blog.thumbnail)} fill sizes="48px" className="object-cover" alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-foreground truncate">{blog.title}</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(blog.createdAt || blog.created_at)}</p>
                                                </div>
                                                <div className={`p-1.5 rounded-md transition-colors ${blog.isAdded ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:text-primary'}`}>
                                                    {blog.isAdded ? <ChevronRight className="size-4" /> : <Plus className="size-4" />}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed border-border">
                                            <Search className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                                            <p className="text-sm text-muted-foreground">{searchQuery ? 'No blogs found.' : 'No blogs yet.'}</p>
                                        </div>
                                    )}
                                </div>

                                {Math.ceil(totalBlogs / BLOGS_PER_PAGE) > 1 && (
                                    <div className="flex items-center justify-between pt-4">
                                        <button type="button" disabled={currentPage === 1 || loadingBlogs} onClick={() => setCurrentPage(p => p - 1)} className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40">
                                            <ChevronLeft className="size-4" />Prev
                                        </button>
                                        <span className="text-xs text-muted-foreground">{currentPage} / {Math.ceil(totalBlogs / BLOGS_PER_PAGE)}</span>
                                        <button type="button" disabled={currentPage === Math.ceil(totalBlogs / BLOGS_PER_PAGE) || loadingBlogs} onClick={() => setCurrentPage(p => p + 1)} className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40">
                                            Next<ChevronRight className="size-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
