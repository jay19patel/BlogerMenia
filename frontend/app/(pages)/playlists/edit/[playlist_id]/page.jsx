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
            router.push('/login');
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
                <div className="flex items-center justify-center gap-3 bg-background px-6 py-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                    <span className="h-5 w-5 border-2 border-foreground border-r-transparent animate-spin"></span>
                    <span className="font-mono font-bold text-sm uppercase tracking-widest text-foreground">Loading...</span>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3 bg-background px-6 py-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                    <span className="font-mono font-bold text-sm uppercase tracking-widest text-foreground">Loading Playlist...</span>
                </div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="font-mono font-bold text-foreground uppercase tracking-widest mb-4">Playlist not found.</p>
                    <Link href="/my-blogs" className="text-purple-900 font-mono font-bold underline">
                        Back to My Blogs
                    </Link>
                </div>
            </div>
        );
    }

    const ownerIdentifier = user?.username || user?.email?.split('@')[0] || user?.email;

    return (
        <div className="min-h-screen py-10 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b-2 border-foreground pb-4">
                    <div>
                        <Link
                            href="/my-blogs"
                            className="inline-flex items-center gap-2 text-foreground hover:text-purple-900 mb-4 font-mono font-bold uppercase tracking-widest text-sm hover:translate-x-[-4px] transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            BACK TO DASHBOARD
                        </Link>
                        <h1 className="text-4xl font-extrabold text-foreground tracking-tighter flex items-center gap-3 uppercase">
                            <span className="p-2 border-2 border-foreground bg-purple-900 text-white shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                                <ListMusic className="w-8 h-8" />
                            </span>
                            MANAGE PLAYLIST
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/playlists/${ownerIdentifier}/${playlist?.slug}`}
                            className="px-6 py-3 border-2 border-foreground bg-background text-foreground font-mono font-bold uppercase tracking-widest text-[10px] hover:bg-purple-900 hover:text-white transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                            target="_blank"
                        >
                            <Eye className="w-4 h-4" />
                            PREVIEW
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Playlist Details */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] overflow-hidden sticky top-8 p-8">
                            <h2 className="text-2xl font-extrabold text-foreground mb-6 flex items-center gap-2 uppercase tracking-tighter border-b-2 border-foreground pb-2">
                                Playlist Details
                            </h2>

                            <div className="space-y-6">
                                {/* Cover Image Upload */}
                                <div>
                                    <label className="block text-xs font-mono font-bold text-foreground uppercase tracking-widest mb-3">
                                        Cover Image
                                    </label>
                                    <div
                                        onClick={() => document.getElementById('playlist-image-edit').click()}
                                        className="relative group overflow-hidden mb-4 aspect-video bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] flex items-center justify-center cursor-pointer hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                    >
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="w-10 h-10 text-foreground mx-auto mb-2" />
                                                <p className="text-[10px] font-mono font-bold text-foreground uppercase tracking-wider">CLICK TO UPLOAD</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        id="playlist-image-edit"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-mono font-bold text-foreground uppercase tracking-widest mb-2">
                                        Playlist Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono font-bold text-sm"
                                    />
                                </div>

                                {/* Slug */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-mono font-bold text-foreground uppercase tracking-widest">
                                        Custom Slug
                                    </label>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[\s_-]+/g, '-').replace(/[^\w-]/g, ''))}
                                        placeholder="playlist-url-slug"
                                        className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all text-sm font-mono"
                                    />
                                    <p className="text-[10px] font-mono font-bold text-foreground pl-1 uppercase tracking-widest">
                                        URL: /playlists/{ownerIdentifier}/<span className="text-purple-900">{slug}</span>
                                    </p>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-mono font-bold text-foreground uppercase tracking-widest mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all resize-none text-sm font-mono"
                                    />
                                </div>

                                {/* Visibility */}
                                <div className="flex items-center justify-between p-4 bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                                    <div>
                                        <p className="text-sm font-mono font-bold text-foreground uppercase tracking-widest">Visibility</p>
                                        <p className="text-xs font-mono text-foreground">{isPublic ? 'PUBLIC' : 'PRIVATE'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(!isPublic)}
                                        className={`relative inline-flex h-6 w-11 items-center transition-colors border-2 border-foreground ${isPublic ? 'bg-green-400' : 'bg-background'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform bg-foreground transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleUpdatePlaylist}
                                    disabled={isSaving}
                                    className="w-full py-4 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest hover:bg-purple-900 transition-all shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    SAVE PLAYLIST
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Blog Management */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                            {/* Included Blogs */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2 uppercase tracking-tighter">
                                        Included Blogs
                                        <span className="px-3 py-1 bg-foreground text-background border-2 border-foreground font-mono font-bold text-xs">{blogs.length}</span>
                                    </h2>
                                </div>

                                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
                                    {blogs.length > 0 ? (
                                        blogs.map((blog, idx) => (
                                            <div
                                                key={getBlogId(blog)}
                                                className="group bg-background p-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-4"
                                            >
                                                <div className="w-16 h-16 bg-background overflow-hidden shrink-0 border-2 border-foreground">
                                                    <img
                                                        src={getImageUrl(blog.thumbnail)}
                                                        className="w-full h-full object-cover"
                                                        alt=""
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mb-1 border-b-2 border-foreground pb-1 inline-block">
                                                        #{idx + 1}
                                                    </p>
                                                    <h4 className="text-sm font-bold text-foreground truncate">{blog.title}</h4>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveBlog(blog)}
                                                    className="p-2 border-2 border-foreground bg-background text-foreground hover:bg-red-500 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                                                    title="Remove from playlist"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-background border-2 border-dashed border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
                                            <BookOpen className="w-12 h-12 text-foreground mx-auto mb-3" />
                                            <p className="text-sm font-mono font-bold text-foreground px-6 uppercase tracking-widest">NO BLOGS IN THIS PLAYLIST YET.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Available Blogs */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2 uppercase tracking-tighter">
                                        Add Content
                                        <span className="font-mono text-xs border-l-2 border-foreground pl-2 ml-2">| {totalBlogs} TOTAL</span>
                                    </h2>
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH YOUR ARTICLES..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full pl-11 pr-4 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono font-bold text-sm uppercase tracking-widest"
                                    />
                                </div>

                                {/* Blog List */}
                                <div className="space-y-3 min-h-[400px]">
                                    {loadingBlogs ? (
                                        [...Array(5)].map((_, i) => (
                                            <div key={i} className="animate-pulse bg-background p-4 border-2 border-foreground flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-200 border-2 border-foreground"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-gray-200 border-2 border-foreground w-1/3"></div>
                                                    <div className="h-3 bg-gray-200 border-2 border-foreground w-2/3"></div>
                                                </div>
                                            </div>
                                        ))
                                    ) : availableBlogs.length > 0 ? (
                                        availableBlogs.map((blog) => (
                                            <div
                                                key={getBlogId(blog)}
                                                className={`bg-background p-4 border-2 transition-all flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 ${
                                                    blog.isAdded ? 'border-purple-900 bg-purple-50' : 'border-foreground'
                                                }`}
                                            >
                                                <div className="w-12 h-12 bg-background overflow-hidden shrink-0 border-2 border-foreground">
                                                    <img
                                                        src={getImageUrl(blog.thumbnail)}
                                                        className="w-full h-full object-cover"
                                                        alt=""
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-extrabold text-foreground truncate uppercase">{blog.title}</h4>
                                                    <p className="text-[10px] font-mono text-foreground mt-1 font-bold">{formatDate(blog.createdAt || blog.created_at)}</p>
                                                </div>
                                                {blog.isAdded ? (
                                                    <div className="p-2 border-2 border-foreground bg-purple-900 text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddBlog(blog)}
                                                        className="p-2 border-2 border-foreground bg-background text-foreground hover:bg-purple-900 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                                                        title="Add to playlist"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-background border-2 border-dashed border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
                                            <Search className="w-8 h-8 text-foreground mx-auto mb-3" />
                                            <p className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">
                                                {searchQuery ? 'NO ARTICLES FOUND MATCHING YOUR SEARCH.' : 'NO BLOGS FOUND.'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Pagination */}
                                {Math.ceil(totalBlogs / BLOGS_PER_PAGE) > 1 && (
                                    <div className="flex items-center justify-between pt-4">
                                        <button
                                            type="button"
                                            disabled={currentPage === 1 || loadingBlogs}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="p-2 border-2 border-foreground bg-background text-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-purple-900 hover:text-white disabled:opacity-50 transition-all font-mono font-bold text-[10px] uppercase tracking-widest flex items-center gap-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            PREV
                                        </button>
                                        <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest border-2 border-foreground px-3 py-1 shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                                            {currentPage} / {Math.ceil(totalBlogs / BLOGS_PER_PAGE)}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={currentPage === Math.ceil(totalBlogs / BLOGS_PER_PAGE) || loadingBlogs}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="p-2 border-2 border-foreground bg-background text-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-purple-900 hover:text-white disabled:opacity-50 transition-all font-mono font-bold text-[10px] uppercase tracking-widest flex items-center gap-1"
                                        >
                                            NEXT
                                            <ChevronRight className="w-4 h-4" />
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
