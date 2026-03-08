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
    const { token, user } = useAuth();
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
    const [blogs, setBlogs] = useState([]); // Local blogs state for bulk save

    // Search/Available Blogs State
    const [availableBlogs, setAvailableBlogs] = useState([]);
    const [loadingBlogs, setLoadingBlogs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalBlogs, setTotalBlogs] = useState(0);
    const BLOGS_PER_PAGE = 5;

    const fetchPlaylist = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await api.getPlaylist(playlistId, token);

            // Hydrate blogs if they are just strings (IDs) or partially populated objects
            let currentBlogs = data.blogs || [];
            if (currentBlogs.length > 0) {
                const firstBlog = currentBlogs[0];
                const needsHydration = typeof firstBlog === 'string' || !firstBlog.created_at || typeof firstBlog.category === 'string';

                if (needsHydration) {
                    const blogPromises = currentBlogs.map(blog => {
                        const identifier = typeof blog === 'string' ? blog : blog.slug;
                        return api.getBlogBySlug(identifier, token, false);
                    });
                    const results = await Promise.allSettled(blogPromises);
                    currentBlogs = results
                        .filter(result => result.status === 'fulfilled' && result.value)
                        .map(result => result.value);
                }
            }

            setPlaylist(data);
            setName(data.name || '');
            setDescription(data.description || '');
            setImagePreview(getImageUrl(data.thumbnail?.file_path || data.thumbnail));
            setIsPublic(data.is_public ?? true);
            setSlug(data.slug || '');
            setBlogs(currentBlogs);
        } catch (error) {
            console.error('Error fetching playlist:', error);
            toast.error('Failed to load playlist');
        } finally {
            setIsLoading(false);
        }
    }, [playlistId, token]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const fetchAvailableBlogs = useCallback(async () => {
        if (!user) return;
        try {
            setLoadingBlogs(true);
            const skip = (currentPage - 1) * BLOGS_PER_PAGE;
            const data = await api.getMyBlogs(token, user.id || user._id, searchQuery || null, skip, BLOGS_PER_PAGE);

            // Filter out blogs that are already in the playlist (check local blogs state)
            const playlistBlogIds = blogs.map(b => b.id);
            const filtered = (data?.blogs || []).map(blog => ({
                ...blog,
                isAdded: playlistBlogIds.includes(blog.id)
            }));

            setAvailableBlogs(filtered);
            setTotalBlogs(data?.total || 0);
        } catch (error) {
            console.error('Error fetching available blogs:', error);
        } finally {
            setLoadingBlogs(false);
        }
    }, [user, token, searchQuery, currentPage, blogs]);

    useEffect(() => {
        if (token) fetchPlaylist();
    }, [fetchPlaylist]);

    useEffect(() => {
        if (token && user) fetchAvailableBlogs();
    }, [fetchAvailableBlogs]);

    const handleUpdatePlaylist = async (e) => {
        if (e) e.preventDefault();
        if (!name.trim()) return toast.error('Name is required');

        try {
            setIsSaving(true);

            let finalThumbnailId = playlist?.thumbnail?.id || playlist?.thumbnail || null;
            if (imageFile) {
                const uploadRes = await api.uploadImage(imageFile, 'playlists', token);
                finalThumbnailId = uploadRes.id;
            }

            // Bulk update including blogs list
            await api.updatePlaylist(playlistId, {
                name: name.trim(),
                description: description.trim(),
                thumbnail: finalThumbnailId,
                is_public: isPublic,
                slug: slug.trim(),
                blogs: blogs.map(b => b.id) // Send array of IDs for batch update
            }, token);

            toast.success('Playlist and content saved successfully!');
            fetchPlaylist();
        } catch (error) {
            console.error('Error updating playlist:', error);
            toast.error('Failed to update playlist');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBlog = (blog) => {
        if (blogs.find(b => b.id === blog.id)) return;
        setBlogs(prev => [...prev, blog]);
    };

    const handleRemoveBlog = (blogId) => {
        setBlogs(prev => prev.filter(b => b.id !== blogId));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <Link
                            href="/my-blogs"
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 font-semibold transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-indigo-50 rounded-xl">
                                <ListMusic className="w-8 h-8 text-indigo-600" />
                            </span>
                            Manage Playlist
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/playlists/${user?.email}/${playlist?.slug}`}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                            target="_blank"
                        >
                            <Eye className="w-5 h-5 text-gray-400" />
                            Preview Public View
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Left Column: Metadata Editor */}
                    <div className="xl:col-span-4 space-y-8">
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden sticky top-8">
                            <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600"></div>
                            <div className="p-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    Playlist Details
                                </h2>

                                <div className="space-y-6">
                                    {/* Cover Image Upload */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">
                                            Cover Image
                                        </label>
                                        <div
                                            onClick={() => document.getElementById('playlist-image-edit').click()}
                                            className="relative group rounded-2xl overflow-hidden mb-4 aspect-video bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-indigo-300 transition-all"
                                        >
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center">
                                                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Click to Upload</p>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-all flex items-center justify-center">
                                                <Upload className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
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
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">
                                            Playlist Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                                        />
                                    </div>

                                    {/* Slug Control */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                                            Custom Slug
                                        </label>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[\s_-]+/g, '-').replace(/[^\w-]/g, ''))}
                                            placeholder="playlist-url-slug"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                                        />
                                        <p className="text-[10px] text-gray-400 pl-1">
                                            Current URL: /playlists/{user?.email}/<span className="text-indigo-500">{slug}</span>
                                        </p>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none text-sm leading-relaxed"
                                        />
                                    </div>

                                    {/* Privacy */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Visibility</p>
                                            <p className="text-xs text-gray-500">{isPublic ? 'Public' : 'Private'}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsPublic(!isPublic)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleUpdatePlaylist}
                                        disabled={isSaving}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Save Playlist
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Blogs Management */}
                    <div className="xl:col-span-8 space-y-8">

                        {/* Split View Container */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                            {/* CURRENT BLOGS */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        Included Blogs
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">{blogs.length}</span>
                                    </h2>
                                </div>

                                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                                    {blogs.length > 0 ? (
                                        blogs.map((blog, idx) => (
                                            <div
                                                key={blog.id}
                                                className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-all flex items-center gap-4"
                                            >
                                                <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                                                    <img src={getImageUrl(blog.thumbnail?.file_path || blog.thumbnail)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Step {idx + 1}</p>
                                                    <h4 className="text-sm font-bold text-gray-900 truncate">{blog.title}</h4>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveBlog(blog.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove from playlist"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 font-medium">No blogs in this playlist yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AVAILABLE BLOGS (Search & Add) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        Add Content
                                        <span className="text-gray-300 font-normal">| {totalBlogs} total</span>
                                    </h2>
                                </div>

                                {/* Search Box */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search your articles..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm shadow-sm"
                                    />
                                </div>

                                {/* Available List */}
                                <div className="space-y-3 min-h-[400px]">
                                    {loadingBlogs ? (
                                        [...Array(5)].map((_, i) => (
                                            <div key={i} className="animate-pulse bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-100 rounded-xl"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                                                    <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                                                </div>
                                            </div>
                                        ))
                                    ) : availableBlogs.length > 0 ? (
                                        availableBlogs.map((blog) => (
                                            <div
                                                key={blog.id}
                                                className={`bg-white p-4 rounded-2xl border transition-all flex items-center gap-4 ${blog.isAdded
                                                    ? 'border-green-100 bg-green-50/20'
                                                    : 'border-gray-100 hover:border-indigo-100 shadow-sm'
                                                    }`}
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                                                    <img src={getImageUrl(blog.thumbnail?.file_path || blog.thumbnail)} className="w-full h-full object-cover opacity-70" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-gray-900 truncate">{blog.title}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(blog.created_at)}</p>
                                                </div>
                                                {blog.isAdded ? (
                                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAddBlog(blog)}
                                                        className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all"
                                                        title="Add to playlist"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
                                            <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                            <p className="text-xs text-gray-400 font-medium">No articles found matching your search.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Available Pagination */}
                                {Math.ceil(totalBlogs / BLOGS_PER_PAGE) > 1 && (
                                    <div className="flex items-center justify-between pt-4">
                                        <button
                                            disabled={currentPage === 1 || loadingBlogs}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all font-bold text-xs flex items-center gap-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Prev
                                        </button>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {currentPage} / {Math.ceil(totalBlogs / BLOGS_PER_PAGE)}
                                        </span>
                                        <button
                                            disabled={currentPage === Math.ceil(totalBlogs / BLOGS_PER_PAGE) || loadingBlogs}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all font-bold text-xs flex items-center gap-1"
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
        </div>
    );
}
