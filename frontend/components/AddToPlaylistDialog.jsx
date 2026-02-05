'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function AddToPlaylistDialog({
  isOpen,
  onClose,
  blogData,
  token
}) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      fetchPlaylists();
    }
  }, [isOpen, token]);

  const fetchPlaylists = async () => {
    try {
      setFetching(true);
      const response = await api.getMyPlaylists(token);
      setPlaylists(response.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Failed to load playlists');
    } finally {
      setFetching(false);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (!blogData) return;

    try {
      setLoading(true);
      await api.addBlogToPlaylist(playlistId, {
        blog_id: blogData.id || blogData._id,
        slug: blogData.slug,
        title: blogData.title,
        image: blogData.image,
        excerpt: blogData.excerpt
      }, token);

      toast.success('Blog added to playlist!');
      onClose();
    } catch (error) {
      console.error('Error adding blog to playlist:', error);
      toast.error(error.message || 'Failed to add blog to playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    if (!blogData) return;

    try {
      setCreating(true);
      // Create playlist
      const newPlaylist = await api.createPlaylist({
        name: newPlaylistName.trim(),
        description: '',
        is_public: true
      }, token);

      // Add blog to new playlist
      await api.addBlogToPlaylist(newPlaylist.id, {
        blog_id: blogData.id || blogData._id,
        slug: blogData.slug,
        title: blogData.title,
        image: blogData.image,
        excerpt: blogData.excerpt
      }, token);

      toast.success('Playlist created and blog added!');
      setNewPlaylistName('');
      setShowCreateForm(false);
      fetchPlaylists();
      onClose();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error(error.message || 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Add to Playlist
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {/* Create New Playlist Button */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 mb-4 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Playlist</span>
                </button>
              )}

              {/* Create Playlist Form */}
              {showCreateForm && (
                <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Enter playlist name..."
                    className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateAndAdd}
                      disabled={creating || !newPlaylistName.trim()}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create & Add'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPlaylistName('');
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Playlists List */}
              {playlists.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="mb-2">No playlists yet.</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                  >
                    Create one to get started!
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select a playlist:
                  </p>
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      disabled={loading}
                      className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {playlist.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {playlist.blog_count || 0} blogs
                          </p>
                        </div>
                        {loading && selectedPlaylistId === playlist.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        ) : (
                          <Check className="w-5 h-5 text-indigo-600 opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

