'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    ListMusic,
    BookOpen,
    Eye,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { formatDate, getImageUrl } from '@/lib/utils';

export default function EditPlaylistPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated, loading } = useAuth();
    const playlistId = params.playlist_id;

    // Playlist State
    const [playlist, setPlaylist] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [slug, setSlug] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [blogs, setBlogs] = useState([]);

    // Search/Available Blogs State
    const [availableBlogs, setAvailableBlogs] = useState([]);
    const [loadingBlogs, setLoadingBlogs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalBlogs, setTotalBlogs] = useState(0);
    const BLOGS_PER_PAGE = 5;

    // Redirect unauthenticated users
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
    }, [isAuthenticated, loading, router]);

    const getBlogId = (blog) => blog.id || blog._id?.toString?.() || String(blog._id);

    const fetchPlaylist = useCallback(async () => {
        if (!isAuthenticated || !playlistId) return;
        try {
            setIsLoading(true);
            const data = await api.getPlaylist(playlistId, null);

            // Normalise blogs - populate if we only got IDs back
            let currentBlogs = (data.blogs || []).map(blog => {
                if (typeof blog === 'string') return null;
                return { ...blog, id: getBlogId(blog) };
            }).filter(Boolean);

            setPlaylist(data);
            setName(data.name || '');
            setDescription(data.description || '');
            setIsPublic(data.is_public ?? true);
            setSlug(data.slug || '');
            setImagePreview(getImageUrl(data.cover_image || data.thumbnail) || null);
            setBlogs(currentBlogs);
        } catch (error) {
            console.error('Error fetching playlist:', error);
            toast.error('Failed to load playlist');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, playlistId]);

    const fetchAvailableBlogs = useCallback(async () => {
        if (!isAuthenticated || !user) return;
        const userId = user.id || user._id;
        if (!userId) return;

        try {
            setLoadingBlogs(true);
            const skip = (currentPage - 1) * BLOGS_PER_PAGE;
            const data = await api.getMyBlogs(null, userId, searchQuery || null, skip, BLOGS_PER_PAGE);

            const playlistBlogIds = new Set(blogs.map(getBlogId));
            const mapped = (data?.blogs || []).map(blog => ({
                ...blog,
                id: getBlogId(blog),
                isAdded: playlistBlogIds.has(getBlogId(blog)),
            }));

            setAvailableBlogs(mapped);
            setTotalBlogs(data?.total || 0);
        } catch (error) {
            console.error('Error fetching available blogs:', error);
        } finally {
            setLoadingBlogs(false);
        }
    }, [isAuthenticated, user, searchQuery, currentPage, blogs]);

    useEffect(() => {
        if (isAuthenticated) fetchPlaylist();
    }, [fetchPlaylist]);

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

    const handleUpdatePlaylist = async (e) => {
        if (e) e.preventDefault();
        if (!name.trim()) return toast.error('Name is required');

        try {
            setIsSaving(true);

            let coverImage = playlist?.cover_image || '';
            if (imageFile) {
                const uploadRes = await api.uploadImage(imageFile, 'playlists', null);
                coverImage = uploadRes.file_path || uploadRes.url || '';
            }

            await api.updatePlaylist(playlistId, {
                name: name.trim(),
                description: description.trim(),
                cover_image: coverImage,
                is_public: isPublic,
                slug: slug.trim(),
                blogs: blogs.map(getBlogId).filter(Boolean),
            }, null);

            toast.success('Playlist saved successfully!');
            await fetchPlaylist();
        } catch (error) {
            console.error('Error updating playlist:', error);
            toast.error('Failed to save playlist');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBlog = (blog) => {
        const blogId = getBlogId(blog);
        if (blogs.find(b => getBlogId(b) === blogId)) return;
        setBlogs(prev => [...prev, { ...blog, id: blogId }]);
    };

    const handleRemoveBlog = (blog) => {
        const blogId = getBlogId(blog);
        setBlogs(prev => prev.filter(b => getBlogId(b) !== blogId));
    };

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm flex items-center gap-3">
                    <span className="size-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                    Loading...
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm flex items-center gap-3">
                    <Loader2 className="size-4 animate-spin" />
                    Loading playlist...
                </div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center bg-card border border-border rounded-xl p-10 shadow-sm">
                    <p className="text-muted-foreground mb-4">Playlist not found.</p>
                    <Link href="/my-blogs" className="text-primary hover:underline underline-offset-2 text-sm font-medium">
                        Back to My Blogs
                    </Link>
                </div>
            </div>
        );
    }

    const ownerIdentifier = user?.username || user?.email?.split('@')[0] || user?.email;

    return (
        <div className="min-h-screen py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <Link href="/my-blogs" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
                            <ArrowLeft className="size-4" />Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <span className="bg-primary/10 text-primary rounded-lg p-2"><ListMusic className="size-6" /></span>
                            Edit Playlist
                        </h1>
                    </div>
                    <Link href={`/playlists/${ownerIdentifier}/${playlist?.slug}`} target="_blank" className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Eye className="size-4" />Preview
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Details */}
                    <div className="lg:col-span-4">
                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden sticky top-8 p-6">
                            <h2 className="text-base font-semibold text-foreground mb-5 pb-4 border-b border-border">Playlist Details</h2>
                            <div className="space-y-5">
                                {/* Cover Image */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Cover Image</label>
                                    <div onClick={() => document.getElementById('playlist-image-edit').click()} className="relative overflow-hidden mb-3 aspect-video bg-muted border border-border rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt="Preview" fill sizes="100vw" className="object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-xs text-muted-foreground">Click to upload</p>
                                            </div>
                                        )}
                                    </div>
                                    <input id="playlist-image-edit" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm text-foreground" />
                                </div>

                                {/* Slug */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">URL Slug</label>
                                    <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[\s_-]+/g, '-').replace(/[^\w-]/g, ''))} placeholder="playlist-url-slug" className="w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm font-mono text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground mt-1.5 font-mono truncate">
                                        /playlists/{ownerIdentifier}/<span className="text-primary">{slug}</span>
                                    </p>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none text-sm text-foreground" />
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

                                <button type="button" onClick={handleUpdatePlaylist} disabled={isSaving} className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Blog Management */}
                    <div className="lg:col-span-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                            {/* Included Blogs */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-base font-semibold text-foreground">Included</h2>
                                    <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">{blogs.length}</span>
                                </div>
                                <div className="space-y-2 max-h-200 overflow-y-auto">
                                    {blogs.length > 0 ? (
                                        blogs.map((blog, idx) => (
                                            <div key={getBlogId(blog)} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
                                                <div className="relative size-12 rounded-md overflow-hidden bg-muted shrink-0">
                                                    <Image src={getImageUrl(blog.thumbnail)} fill sizes="48px" className="object-cover" alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-muted-foreground mb-0.5">#{idx + 1}</p>
                                                    <h4 className="text-sm font-medium text-foreground truncate">{blog.title}</h4>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveBlog(blog)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Remove">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed border-border">
                                            <BookOpen className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                                            <p className="text-sm text-muted-foreground">No blogs in this playlist yet.</p>
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

                                <div className="space-y-2 min-h-100">
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
                                            <div key={getBlogId(blog)} className={`p-3 rounded-lg border transition-all flex items-center gap-3 ${blog.isAdded ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40'}`}>
                                                <div className="relative size-12 rounded-md overflow-hidden bg-muted shrink-0">
                                                    <Image src={getImageUrl(blog.thumbnail)} fill sizes="48px" className="object-cover" alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-foreground truncate">{blog.title}</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(blog.createdAt || blog.created_at)}</p>
                                                </div>
                                                {blog.isAdded ? (
                                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary"><ChevronRight className="size-4" /></div>
                                                ) : (
                                                    <button type="button" onClick={() => handleAddBlog(blog)} className="p-1.5 rounded-md bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Add to playlist">
                                                        <Plus className="size-4" />
                                                    </button>
                                                )}
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
