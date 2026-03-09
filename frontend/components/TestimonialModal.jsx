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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[120%] bg-white/30 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[120%] bg-indigo-200/20 rounded-full blur-3xl"></div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="relative text-center">
                        <div className="inline-flex p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-3">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Share Your Experience</h3>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <User className="w-4 h-4 text-indigo-500" />
                                Role / Designation
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Frontend Developer, Student"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium text-gray-900"
                            />
                            <p className="mt-2 text-xs text-gray-400">This helps others know who you are</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                Your Feedback
                            </label>
                            <textarea
                                rows={5}
                                placeholder="Tell us what you love about BlogerMenia..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all resize-none font-medium text-gray-900"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-1 text-amber-500">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-current" />
                                ))}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    "Sending..."
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Feedback
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
