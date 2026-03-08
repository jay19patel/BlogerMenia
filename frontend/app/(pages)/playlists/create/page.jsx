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
    ListMusic,
    BookOpen,
    Eye,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDate, getImageUrl } from '@/lib/utils';

export default function CreatePlaylistPage() {
    const router = useRouter();
    const { token, user } = useAuth();

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

    const fetchAvailableBlogs = useCallback(async () => {
        if (!user) return;
        try {
            setLoadingBlogs(true);
            const skip = (currentPage - 1) * BLOGS_PER_PAGE;
            const data = await api.getMyBlogs(token, user.id || user._id, searchQuery || null, skip, BLOGS_PER_PAGE);

            // Mark blogs as selected if they are in the selectedBlogs array
            const selectedIds = selectedBlogs.map(b => b.id);
            const filtered = (data?.blogs || []).map(blog => ({
                ...blog,
                isAdded: selectedIds.includes(blog.id)
            }));

            setAvailableBlogs(filtered);
            setTotalBlogs(data?.total || 0);
        } catch (error) {
            console.error('Error fetching available blogs:', error);
        } finally {
            setLoadingBlogs(false);
        }
    }, [user, token, searchQuery, currentPage, selectedBlogs]);

    useEffect(() => {
        if (token && user) fetchAvailableBlogs();
    }, [fetchAvailableBlogs]);

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

    const toggleSelectBlog = (blog) => {
        if (selectedBlogs.some(b => b.id === blog.id)) {
            setSelectedBlogs(selectedBlogs.filter(b => b.id !== blog.id));
        } else {
            setSelectedBlogs([...selectedBlogs, blog]);
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

            let finalThumbnailId = null;
            if (imageFile) {
                const uploadRes = await api.uploadImage(imageFile, 'playlists', token);
                finalThumbnailId = uploadRes.id;
            }

            const playlistData = {
                name: name.trim(),
                slug: slug.trim() || generateSlug(name),
                description: description.trim(),
                thumbnail: finalThumbnailId,
                is_public: isPublic,
                blogs: selectedBlogs.map(b => b.id) // Bulk save
            };

            const result = await api.createPlaylist(playlistData, token);

            toast.success('Playlist created successfully!');
            router.push(`/playlists/${user?.email}/${result.slug || result.id}`);
        } catch (error) {
            console.error('Error creating playlist:', error);
            toast.error(error.message || 'Failed to create playlist');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                                <Plus className="w-8 h-8 text-indigo-600" />
                            </span>
                            Create Playlist
                        </h1>
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

                                <form onSubmit={handleCreatePlaylist} className="space-y-6">
                                    {/* Cover Image Upload */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">
                                            Cover Image
                                        </label>
                                        <div
                                            onClick={() => document.getElementById('playlist-image-upload').click()}
                                            className="relative group rounded-2xl overflow-hidden mb-4 aspect-video bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-indigo-300 transition-all"
                                        >
                                            {imagePreview ? (
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
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
                                            id="playlist-image-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">
                                            Playlist Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., My Favorite Stories"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                                        />
                                    </div>

                                    {/* Slug Control */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                                                Custom Slug
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setAutoSlug(!autoSlug)}
                                                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${autoSlug ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}
                                            >
                                                {autoSlug ? 'AUTO-GENERATING' : 'MANUAL'}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => {
                                                setSlug(generateSlug(e.target.value));
                                                setAutoSlug(false);
                                            }}
                                            disabled={autoSlug}
                                            placeholder="playlist-url-slug"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                                        />
                                        {autoSlug && name && (
                                            <p className="text-[10px] text-gray-400 pl-1">
                                                URL: /playlists/{user?.email}/<span className="text-indigo-500">{slug}</span>
                                            </p>
                                        )}
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
                                            placeholder="What is this collection about?"
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
                                            type="button"
                                            onClick={() => setIsPublic(!isPublic)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !name.trim()}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Save Playlist
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Blogs Selection */}
                    <div className="xl:col-span-8 space-y-8">

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                            {/* CURRENT BLOGS */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        Included Blogs
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">{selectedBlogs.length}</span>
                                    </h2>
                                </div>

                                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
                                    {selectedBlogs.length > 0 ? (
                                        selectedBlogs.map((blog, idx) => (
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
                                                    onClick={() => toggleSelectBlog(blog)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove from playlist"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-400 font-medium px-6">Select articles from the list on the right to add them to your new playlist.</p>
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
                                        placeholder="Search your library..."
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
                                                onClick={() => toggleSelectBlog(blog)}
                                                className={`bg-white p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${blog.isAdded
                                                    ? 'border-indigo-600 bg-indigo-50/10'
                                                    : 'border-gray-100 hover:border-indigo-200 shadow-sm'
                                                    }`}
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                                                    <img src={getImageUrl(blog.thumbnail?.file_path || blog.thumbnail)} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-gray-900 truncate">{blog.title}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(blog.created_at)}</p>
                                                </div>
                                                <div className={`p-2 rounded-lg transition-all ${blog.isAdded
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                    {blog.isAdded ? <ChevronRight className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                </div>
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
