'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AddToPlaylistDialog({
  isOpen,
  onClose,
  blogData,
  token
}) {
  const { user } = useAuth();
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
      const userId = user?.id || user?._id;
      const response = await api.getMyPlaylists(token, userId);
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
        image: blogData.thumbnail?.file_path || blogData.image,
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
      await api.addBlogToPlaylist(newPlaylist.id || newPlaylist.slug, {
        blog_id: blogData.id || blogData._id,
        slug: blogData.slug,
        title: blogData.title,
        image: blogData.thumbnail?.file_path || blogData.image,
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
      <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] w-full max-w-lg mx-auto max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b-2 border-foreground bg-background">
          <div>
            <h2 className="text-xl font-extrabold text-foreground uppercase tracking-tighter">
              Add to Playlist
            </h2>
            <p className="text-[10px] font-mono font-bold text-foreground mt-0.5 uppercase tracking-widest">
              SELECT A PLAYLIST OR CREATE A NEW ONE
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-transparent hover:border-foreground hover:bg-foreground hover:text-background transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-foreground">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-foreground" />
              <p className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">LOADING PLAYLISTS...</p>
            </div>
          ) : (
            <>
              {/* Playlists List */}
              <div className="space-y-4 mb-6">
                {playlists.length > 0 && (
                  <p className="text-xs font-mono font-extrabold text-foreground uppercase tracking-widest border-b-2 border-foreground pb-1">
                    Your Playlists
                  </p>
                )}

                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.slug)}
                    disabled={loading}
                    className="group w-full p-4 text-left bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-2 border-foreground bg-purple-900 flex items-center justify-center text-white font-mono font-bold text-sm shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                          {playlist.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-foreground uppercase">
                            {playlist.name}
                          </h3>
                          <p className="text-[10px] font-mono font-bold text-foreground tracking-widest">
                            {playlist.blog_count || 0} ITEMS
                          </p>
                        </div>
                      </div>
                      {loading && selectedPlaylistId === playlist.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-foreground" />
                      ) : (
                        <div className="w-8 h-8 border-2 border-foreground bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-2 shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                          <Plus className="w-4 h-4 text-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                {playlists.length === 0 && !showCreateForm && (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
                    <p className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">YOU DON'T HAVE ANY PLAYLISTS YET.</p>
                  </div>
                )}
              </div>

              {/* Create New Form */}
              {showCreateForm ? (
                <div className="bg-background border-2 border-foreground p-5 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] animate-in slide-in-from-bottom-2">
                  <h3 className="text-xs font-mono font-extrabold text-foreground mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <Plus className="w-4 h-4" />
                    NEW PLAYLIST
                  </h3>
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g. 'PYTHON MASTERY'"
                    className="w-full px-4 py-2.5 mb-4 border-2 border-foreground bg-background text-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm uppercase transition-all"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPlaylistName('');
                      }}
                      className="flex-1 px-4 py-2 bg-background border-2 border-foreground text-foreground font-mono font-bold uppercase tracking-widest hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-[10px] transition-all"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleCreateAndAdd}
                      disabled={creating || !newPlaylistName.trim()}
                      className="flex-1 px-4 py-2 bg-foreground border-2 border-foreground text-background font-mono font-bold uppercase tracking-widest hover:bg-purple-900 hover:text-white disabled:opacity-50 disabled:shadow-none shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'CREATE & ADD'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-4 flex items-center justify-center gap-2 text-foreground font-mono font-bold uppercase tracking-widest border-2 border-foreground bg-background shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 hover:bg-purple-900 hover:text-white transition-all text-xs"
                >
                  <Plus className="w-4 h-4" />
                  CREATE NEW PLAYLIST
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

