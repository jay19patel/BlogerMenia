"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Mail, MapPin, Phone, Send, Loader2, MessageSquare, Clock, Globe } from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.contactUs(formData);
            toast.success("Message sent! We'll get back to you soon.");
            setFormData({ name: "", email: "", subject: "", message: "" });
        } catch (error) {
            console.error("Contact error:", error);
            toast.error(error.message || "Failed to send message.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-foreground uppercase tracking-tighter sm:text-5xl mb-4">
                        SYSTEM.PING
                    </h1>
                    <p className="text-lg text-gray-700 max-w-2xl mx-auto font-serif italic">
                        Have a question or feedback? We'd love to hear from you.
                        Fill out the form below and we'll transmit it to our servers.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Contact Info */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-background p-8 border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
                            <h2 className="text-xl font-extrabold text-foreground mb-6 uppercase tracking-tight flex items-center gap-2 pb-4 border-b-2 border-foreground">
                                <MessageSquare className="w-5 h-5" />
                                Transmit Data
                            </h2>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                                        <Mail className="w-6 h-6 text-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Email</p>
                                        <a href="mailto:hello@blogermenia.com" className="text-sm font-mono text-gray-600 hover:text-foreground transition-colors hover:underline decoration-2 underline-offset-4">
                                            hello@blogermenia.com
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                                        <Phone className="w-6 h-6 text-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Phone</p>
                                        <a href="tel:+15552345678" className="text-sm font-mono text-gray-600 hover:text-foreground transition-colors hover:underline decoration-2 underline-offset-4">
                                            +1 (555) 234-5678
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]">
                                        <MapPin className="w-6 h-6 text-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">HQ Node</p>
                                        <p className="text-sm font-mono text-gray-600">
                                            545 Mavis Island, Chicago,<br />IL 99191, USA
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-foreground p-8 border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(88,28,135,1)] text-background hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(88,28,135,1)] transition-all">
                            <Clock className="w-8 h-8 mb-4 text-background" />
                            <h3 className="text-lg font-extrabold mb-2 uppercase tracking-tight">Latency Specs</h3>
                            <p className="text-gray-300 text-sm font-mono leading-relaxed">
                                Our support nodes are online Monday through Friday.
                                We guarantee TCP handshakes within 24 hours.
                            </p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-8">
                        <div className="bg-background p-8 sm:p-10 border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Identifier</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Your full name"
                                        className="w-full px-4 py-3 bg-background border-2 border-foreground focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all placeholder:text-gray-400 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="you@example.com"
                                        className="w-full px-4 py-3 bg-background border-2 border-foreground focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all placeholder:text-gray-400 font-mono text-sm"
                                    />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Topic</label>
                                    <input
                                        type="text"
                                        name="subject"
                                        required
                                        value={formData.subject}
                                        onChange={handleChange}
                                        placeholder="What's this regarding?"
                                        className="w-full px-4 py-3 bg-background border-2 border-foreground focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all placeholder:text-gray-400 font-mono text-sm"
                                    />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Payload</label>
                                    <textarea
                                        name="message"
                                        required
                                        rows={6}
                                        value={formData.message}
                                        onChange={handleChange}
                                        placeholder="Tell us how we can help..."
                                        className="w-full px-4 py-3 bg-background border-2 border-foreground focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] transition-all resize-none placeholder:text-gray-400 font-mono text-sm"
                                    />
                                </div>
                                <div className="sm:col-span-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full sm:w-auto px-10 py-3 bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest text-xs hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-[6px_6px_0px_0px_rgba(88,28,135,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Transmitting...
                                            </>
                                        ) : (
                                            <>
                                                Execute Ping
                                                <Send className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
