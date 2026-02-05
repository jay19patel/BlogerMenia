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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Add to Playlist
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Select a playlist or create a new one
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm text-gray-500">Loading playlists...</p>
            </div>
          ) : (
            <>
              {/* Playlists List */}
              <div className="space-y-3 mb-6">
                {playlists.length > 0 && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Your Playlists
                  </p>
                )}

                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    disabled={loading}
                    className="group w-full p-4 text-left bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {playlist.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {playlist.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {playlist.blog_count || 0} items
                          </p>
                        </div>
                      </div>
                      {loading && selectedPlaylistId === playlist.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-2">
                          <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                {playlists.length === 0 && !showCreateForm && (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <p className="text-gray-500 dark:text-gray-400">You don't have any playlists yet.</p>
                  </div>
                )}
              </div>

              {/* Create New Form */}
              {showCreateForm ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-indigo-100 dark:border-indigo-900/50 animate-in slide-in-from-bottom-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    New Playlist
                  </h3>
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g. 'Python Mastery'"
                    className="w-full px-4 py-2.5 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPlaylistName('');
                      }}
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAndAdd}
                      disabled={creating || !newPlaylistName.trim()}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Create & Add'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-3 flex items-center justify-center gap-2 text-indigo-600 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors border border-transparent hover:border-indigo-100"
                >
                  <Plus className="w-5 h-5" />
                  Create New Playlist
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

