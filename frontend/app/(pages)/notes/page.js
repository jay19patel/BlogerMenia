"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import NoteCard from "@/components/NoteCard";
import GridBackground from "@/components/GridBackground";
import Breadcrumb from "@/components/Breadcrumb";
import LoaderCard from "@/components/ui/loader";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function NotesPage() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        tags: "",
        is_public: true
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token"); // Assuming simple token storage for now
        if (token) {
            // Fetch User
            api.getCurrentUser(token).then(setCurrentUser).catch(console.error);
            fetchNotes(token);
        } else {
            // Public view
            fetchNotes(null);
        }
    }, []);

    const fetchNotes = async (token) => {
        try {
            setLoading(true);
            // If logged in, maybe show my notes mixed with public? Or just public feed and my notes tab?
            // Let's rely on the public feed endpoint for main page.
            // But the user might want to see 'my notes'.
            // For simplicity, let's fetch all (which returns public)
            const data = await api.getNotes(token);
            // NoteViewSet returns array directly if not paginated or paginated object. 
            // DRF ModelViewSet with default pagination returns {count, next, previous, results}
            // If pagination is not set globally, it returns list.
            // Assuming default DRF settings (might be PageNumberPagination).
            // Let's handle both.
            const results = Array.isArray(data) ? data : (data.results || []);
            setNotes(results);
        } catch (e) {
            console.error("Failed to fetch notes", e);
            toast.error("Failed to load notes");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        if (!token) return toast.error("Please login to create notes");

        try {
            if (editingId) {
                await api.updateNote(editingId, formData, token);
                toast.success("Note updated");
            } else {
                await api.createNote(formData, token);
                toast.success("Note created");
            }
            setShowModal(false);
            setFormData({ title: "", content: "", tags: "", is_public: true });
            setEditingId(null);
            fetchNotes(token);
        } catch (e) {
            toast.error("Failed to save note");
        }
    };

    const handleEdit = (note) => {
        setFormData({
            title: note.title,
            content: note.content,
            tags: note.tags,
            is_public: note.is_public
        });
        setEditingId(note.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        const token = localStorage.getItem("token");
        try {
            await api.deleteNote(id, token);
            toast.success("Note deleted");
            fetchNotes(token);
        } catch (e) {
            toast.error("Failed to delete note");
        }
    };

    const handleLike = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return toast.error("Login to like notes");
        try {
            const res = await api.likeNote(id, token);
            setNotes(prev => prev.map(n => n.id === id ? { ...n, is_liked: res.status === 'liked', total_likes: res.total_likes } : n));
        } catch (e) {
            console.error(e);
        }
    };

    const breadcrumbItems = [
        { label: "Home", href: "/" },
        { label: "Notes", href: null },
    ];

    return (
        <GridBackground>
            <div className="min-h-screen pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Breadcrumb items={breadcrumbItems} />

                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Notes</h1>
                            <p className="text-lg text-gray-600">Capture your thoughts and ideas</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setFormData({ title: "", content: "", tags: "", is_public: true });
                                setShowModal(true);
                            }}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-medium shadow-lg shadow-indigo-600/20"
                        >
                            <Plus className="w-5 h-5" />
                            New Note
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-12">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="relative h-40 sm:h-48 lg:h-56">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <LoaderCard message="Loading notes…" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-6">
                            {notes.length > 0 ? (
                                notes.map(note => (
                                    <NoteCard
                                        key={note.id}
                                        note={note}
                                        onLike={handleLike}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        isOwner={currentUser && currentUser.username === note.user?.username}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-16">
                                    <p className="text-xl text-gray-600 mb-4">No notes found</p>
                                    <p className="text-gray-500">
                                        Create a new note to get started!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {showModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Note' : 'Create Note'}</h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                                        <input
                                            type="text"
                                            value={formData.tags}
                                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="ideas, work, personal"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="is_public"
                                            checked={formData.is_public}
                                            onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="is_public" className="text-sm text-gray-700">Make Public</label>
                                    </div>
                                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">
                                        {editingId ? 'Update Note' : 'Create Note'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GridBackground>
    );
}
