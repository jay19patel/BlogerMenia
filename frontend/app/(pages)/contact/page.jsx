"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Mail, MapPin, Phone, Send, CheckCircle, AlertCircle, MessageSquare, Clock, Globe } from "lucide-react";
import LoaderCard from "@/components/ui/loader";
import GridBackground from "@/components/GridBackground";
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
        <GridBackground>
            <div className="relative min-h-screen py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center mb-16 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            We typicaly reply within 24 hours
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
                            Let's <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Connect</span>
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                            Have a question or just want to say hi? We'd love to hear from you.
                            Fill out the form below and our team will get back to you shortly.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        {/* Info Column */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-xl shadow-indigo-500/5 transition-all hover:shadow-indigo-500/10">
                                <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                                    Contact Information
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex gap-4 group">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                                            <Mail className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-400 mb-1">Email us at</p>
                                            <a href="mailto:hello@blogermenia.com" className="text-gray-900 font-bold hover:text-indigo-600 transition-colors">
                                                hello@blogermenia.com
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 group">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                                            <Phone className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-400 mb-1">Call us at</p>
                                            <a href="tel:+15552345678" className="text-gray-900 font-bold hover:text-indigo-600 transition-colors">
                                                +1 (555) 234-5678
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 group">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                                            <MapPin className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-400 mb-1">Visit us</p>
                                            <p className="text-gray-900 font-bold leading-snug">
                                                545 Mavis Island, Chicago,<br />IL 99191, USA
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <h4 className="text-lg font-bold mb-2">Global Support</h4>
                                <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                                    Operating across 50+ countries with dedicated local representative teams.
                                </p>
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Globe className="w-4 h-4" />
                                    View Worldwide Offices
                                </div>
                            </div>
                        </div>

                        {/* Form Column */}
                        <div className="lg:col-span-8">
                            <div className="bg-white/60 backdrop-blur-xl p-8 sm:p-12 rounded-[40px] border border-white/40 shadow-2xl relative overflow-hidden">
                                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Your Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full px-6 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-400 font-medium"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full px-6 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-400 font-medium"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Subject</label>
                                        <input
                                            type="text"
                                            name="subject"
                                            required
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-400 font-medium"
                                            placeholder="How can we help?"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Message</label>
                                        <textarea
                                            name="message"
                                            required
                                            rows={5}
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all resize-none placeholder:text-gray-400 font-medium"
                                            placeholder="Write your message here..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                Send Message
                                                <Send className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Background Accents for Form */}
                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-indigo-50 rounded-full blur-3xl pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </GridBackground>
    );
}

// Add simple Loader2 icon for consistency
const Loader2 = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
