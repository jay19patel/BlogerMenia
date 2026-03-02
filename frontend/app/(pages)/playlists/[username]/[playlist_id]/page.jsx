'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ArrowLeft, BookOpen, Trash2, Loader2, Edit2, X, Save, Eye, Heart } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Image from 'next/image';
import BlogCard from '@/components/BlogCard';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token: authToken } = useAuth();
  const playlistSlug = params.playlist_id; // This is actually the slug now
  const username = params.username;
  const [removingId, setRemovingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [saving, setSaving] = useState(false);

  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlaylist = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getPlaylist(playlistSlug, authToken);
      setPlaylist(data);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast.error('Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  }, [playlistSlug, authToken]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const isOwner = user && playlist && playlist.owner && user.email === playlist.owner.email;

  useEffect(() => {
    if (playlist) {
      setEditName(playlist.name);
      setEditDescription(playlist.description || '');
      setEditCoverImage(playlist.cover_image || '');
    }
  }, [playlist]);

  const handleRemoveBlog = async (blogId) => {
    if (!confirm('Remove this blog from playlist?')) {
      return;
    }

    try {
      setRemovingId(blogId);
      await api.removeBlogFromPlaylist(playlistSlug, blogId, authToken);
      if (playlist && playlist.blogs) {
        setPlaylist({
          ...playlist,
          blogs: playlist.blogs.filter(b => b.id !== blogId),
          blog_count: Math.max(0, (playlist.blog_count || 1) - 1)
        });
      }
      toast.success('Blog removed from playlist');
    } catch (error) {
      console.error('Error removing blog:', error);
      toast.error(error.message || 'Failed to remove blog');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error('Playlist name is required');
      return;
    }

    try {
      setSaving(true);
      await api.updatePlaylist(playlistSlug, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        cover_image: editCoverImage.trim() || null
      }, authToken);

      toast.success('Playlist updated successfully!');
      setPlaylist({
        ...playlist,
        name: editName.trim(),
        description: editDescription.trim() || null,
        cover_image: editCoverImage.trim() || null
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error(error.message || 'Failed to update playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(playlist.name);
    setEditDescription(playlist.description || '');
    setEditCoverImage(playlist.cover_image || '');
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Playlist Not Found
          </h1>
          <Link
            href={`/blogs/${username}`}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {playlist?.owner?.full_name || username}'s Articles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href={`/blogs/${username}`}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {playlist?.owner?.full_name || username}'s Articles
        </Link>

        {/* Playlist Profile Section - Similar to User Profile */}
        <div className="mb-12 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Cover Image */}
          <div className="relative w-full h-32 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600">
            {playlist.cover_image ? (
              <Image
                src={playlist.cover_image}
                alt={playlist.name}
                fill
                className="object-cover"
              />
            ) : null}
            {isOwner && !isEditing && (
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg hover:bg-white transition-colors shadow-lg"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Playlist
                </button>
              </div>
            )}
          </div>

          <div className="px-8 py-6">
            {/* Playlist Info */}
            <div className="flex items-center justify-center sm:justify-start mb-4 -mt-16">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-white rounded-full overflow-hidden shadow-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            {/* Playlist Name and Description */}
            <div className="flex items-center justify-center flex-col sm:flex-row max-sm:gap-4 sm:justify-between mb-6">
              <div className="block">
                <h3 className="font-bold text-3xl text-gray-900 mb-1 max-sm:text-center">
                  {playlist.name}
                </h3>
                <p className="font-normal text-base leading-6 text-gray-500 max-sm:text-center">
                  Playlist by {playlist.owner?.full_name || playlist.owner?.email}
                </p>
                {playlist.description && (
                  <p className="font-normal text-sm leading-5 text-gray-600 mt-2 max-sm:text-center">
                    {playlist.description}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col flex-1 gap-6 lg:gap-0 lg:flex-row lg:justify-between">
              <div className="w-full lg:w-1/3 border-b pb-6 lg:border-b-0 lg:pb-0 lg:border-r border-gray-100">
                <div className="font-bold text-3xl text-gray-900 mb-2 text-center">
                  {playlist.blog_count || 0}
                </div>
                <span className="text-sm text-gray-500 text-center block">Blogs</span>
              </div>

              <div className="w-full lg:w-1/3 border-b pb-6 lg:border-b-0 lg:pb-0 lg:border-r border-gray-100">
                <div className="font-bold text-3xl text-gray-900 mb-2 text-center">
                  {(playlist.total_views || 0).toLocaleString()}
                </div>
                <span className="text-sm text-gray-500 text-center block">Total Views</span>
              </div>

              <div className="w-full lg:w-1/3">
                <div className="font-bold text-3xl text-gray-900 mb-2 text-center">
                  {(playlist.total_likes || 0).toLocaleString()}
                </div>
                <span className="text-sm text-gray-500 text-center block">Total Likes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !saving) {
                handleCancelEdit();
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Playlist</h2>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Image URL
                    </label>
                    <input
                      type="text"
                      value={editCoverImage}
                      onChange={(e) => setEditCoverImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {editCoverImage && (
                      <div className="mt-3">
                        <img
                          src={editCoverImage}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg border border-gray-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    {!editCoverImage && (
                      <div className="mt-3 w-full h-48 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-lg border border-gray-300 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-white opacity-50" />
                      </div>
                    )}
                  </div>

                  {/* Playlist Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Playlist Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter playlist name"
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter playlist description"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || !editName.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/30"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blogs Grid - Same design as All Articles using BlogCard */}
        {playlist.blogs && playlist.blogs.length > 0 ? (
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Blogs in this Playlist ({playlist.blogs.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlist.blogs.map((blog, index) => {
                // Transform blog data to match BlogCard format
                // Use publishedDate first, then created_at, then added_at (for backward compatibility)
                let blogDate = '';
                if (blog.publishedDate) {
                  blogDate = new Date(blog.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } else if (blog.created_at) {
                  blogDate = new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } else if (blog.added_at) {
                  // Fallback for old playlists that still have added_at
                  blogDate = new Date(blog.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }

                const blogCardData = {
                  slug: blog.slug,
                  title: blog.title,
                  description: blog.excerpt || '',
                  image: blog.image || '',
                  category: blog.category_name || (typeof blog.category === 'string' ? blog.category : blog.category?.name) || 'Uncategorized',
                  date: blogDate,
                  featured: blog.featured || false,
                  authorUsername: username
                };

                return (
                  <div key={blog.id} className="relative">
                    {/* Index Badge - Top Right Corner */}
                    <div className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full font-bold text-sm shadow-lg">
                      {index + 1}
                    </div>

                    {/* BlogCard Component */}
                    <div className="relative">
                      <BlogCard blog={blogCardData} />

                      {/* Remove Button - Overlay on hover (owner only) */}
                      {isOwner && authToken && (
                        <div className="absolute bottom-4 right-4 z-10">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveBlog(blog.id);
                            }}
                            disabled={removingId === blog.id}
                            className="p-2 bg-white/90 backdrop-blur-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 shadow-lg"
                            title="Remove from playlist"
                          >
                            {removingId === blog.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No blogs yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add blogs to this playlist to get started
            </p>
            <Link
              href={`/blogs/${username}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go to {playlist?.owner?.full_name || username}'s Articles
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

