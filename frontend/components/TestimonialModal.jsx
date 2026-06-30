"use client";

import { useState } from "react";
import { X, MessageSquare, Star, Send, User } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const INPUT_CLASS = "w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm placeholder:text-muted-foreground text-foreground";

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
            toast.error(error.message || "Failed to submit testimonial");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary rounded-lg p-2">
                            <MessageSquare className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-foreground">Share Feedback</h3>
                            <p className="text-xs text-muted-foreground">Tell us what you think of BlogerMenia</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                        <X className="size-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                            <User className="size-4 text-muted-foreground" />
                            Role / Designation
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Frontend Developer"
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            className={INPUT_CLASS}
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                            <MessageSquare className="size-4 text-muted-foreground" />
                            Your Feedback <span className="text-destructive">*</span>
                        </label>
                        <textarea
                            rows={5}
                            placeholder="Share your experience with BlogerMenia..."
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className={`${INPUT_CLASS} resize-none`}
                            required
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="size-4 text-amber-400 fill-amber-400" />
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                            <Button type="submit" size="sm" disabled={loading} loading={loading}>
                                <Send className="size-4" />
                                {loading ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
