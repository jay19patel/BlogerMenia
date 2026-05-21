"use client";

import { useState } from "react";
import { X, MessageSquare, Star, Send, User } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TestimonialModal({ isOpen, onClose, token, user }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        designation: user?.headline || "",
        content: "",
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.content.trim()) {
            toast.error("Please enter your feedback");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                author: user?.full_name || "User",
                designation: formData.designation,
                content: formData.content,
            };
            await api.submitTestimonial(token, payload);
            toast.success("Thank you for your feedback!");
            onClose();
        } catch (error) {
            console.error("Error submitting testimonial:", error);
            toast.error(error.message || "Failed to submit testimonial");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm">
            <div className="bg-background w-full max-w-lg border-2 border-foreground shadow-[12px_12px_0px_0px_rgba(13,17,23,1)] overflow-hidden relative">
                {/* Header */}
                <div className="relative py-8 bg-purple-900 border-b-2 border-foreground flex items-center justify-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 bg-background text-foreground border-2 border-foreground hover:bg-foreground hover:text-background transition-all shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="relative text-center">
                        <div className="inline-flex p-3 bg-foreground text-background mb-4 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-background uppercase tracking-widest">Feedback Protocol</h3>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-mono font-bold text-foreground mb-2 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4" />
                                [ Role / Designation ]
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Frontend Developer"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                className="w-full px-5 py-3 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all font-mono text-sm text-foreground"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-mono font-bold text-foreground mb-2 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                [ Your Input ]
                            </label>
                            <textarea
                                rows={5}
                                placeholder="Transmit your thoughts on BlogerMenia..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="w-full px-5 py-4 bg-background border-2 border-foreground focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all resize-none font-mono text-sm text-foreground"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t-2 border-foreground mt-8">
                            <div className="flex items-center gap-1 text-foreground">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-current" />
                                ))}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs hover:bg-purple-900 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    "TRANSMITTING..."
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        SUBMIT
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
