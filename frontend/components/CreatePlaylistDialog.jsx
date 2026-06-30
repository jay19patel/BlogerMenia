'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const INPUT_CLASS = "w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm placeholder:text-muted-foreground text-foreground";

export default function CreatePlaylistDialog({ isOpen, onClose, onSuccess }) {
    const { token } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Playlist name is required'); return; }
        setLoading(true);
        try {
            await api.createPlaylist({ name: name.trim(), description: description.trim(), is_public: true }, token);
            toast.success('Playlist created successfully!');
            setName('');
            setDescription('');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to create playlist');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-base font-semibold text-foreground">Create Playlist</h2>
                    <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                        <X className="size-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">Name</label>
                        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Python Tutorials" className={INPUT_CLASS} autoFocus />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this playlist about?" rows={3} className={`${INPUT_CLASS} resize-none`} />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={loading || !name.trim()} loading={loading}>
                            {loading ? 'Creating...' : 'Create Playlist'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
