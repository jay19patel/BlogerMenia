'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function CreatePlaylistDialog({ isOpen, onClose, onSuccess }) {
    const { token } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Playlist name is required');
            return;
        }

        setLoading(true);
        try {
            await api.createPlaylist({
                name: name.trim(),
                description: description.trim(),
                is_public: true
            }, token);

            toast.success('Playlist created successfully!');
            setName('');
            setDescription('');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating playlist:', error);
            toast.error(error.message || 'Failed to create playlist');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)] w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b-2 border-foreground">
                    <h2 className="text-xl font-extrabold text-foreground uppercase tracking-tighter">
                        Create New Playlist
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 border-2 border-transparent hover:border-foreground hover:bg-foreground hover:text-background transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-xs font-mono font-bold text-foreground uppercase tracking-widest mb-1">
                            Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., PYTHON TUTORIALS"
                            className="w-full px-3 py-2 border-2 border-foreground bg-background text-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all uppercase"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-xs font-mono font-bold text-foreground uppercase tracking-widest mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this playlist about?"
                            rows={3}
                            className="w-full px-3 py-2 border-2 border-foreground bg-background text-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] font-mono text-sm transition-all resize-none uppercase"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border-2 border-foreground bg-background text-foreground font-mono font-bold uppercase tracking-widest hover:bg-purple-900 hover:text-white hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none transition-all text-xs"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="px-4 py-2 border-2 border-foreground bg-foreground text-background font-mono font-bold uppercase tracking-widest hover:bg-purple-900 hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none transition-all text-xs disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    CREATING...
                                </>
                            ) : (
                                'CREATE PLAYLIST'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
