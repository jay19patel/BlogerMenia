"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Mail, MapPin, Phone, Send, CheckCircle, AlertCircle } from "lucide-react";
import LoaderCard from "@/components/ui/loader";
import GridBackground from "@/components/GridBackground";

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState({ type: null, message: "" });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: null, message: "" });

        try {
            await api.contactUs(formData);
            setStatus({
                type: "success",
                message: "Thank you! Your message has been sent successfully. We'll get back to you soon.",
            });
            setFormData({ name: "", email: "", subject: "", message: "" });
        } catch (error) {
            console.error("Contact error:", error);
            setStatus({
                type: "error",
                message: error.message || "Failed to send message. Please try again later.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <GridBackground>
            <div className="relative isolate">
                {/* Header Section */}
                <div className="py-24 sm:py-32 text-center">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
                            Contact our team
                        </h1>
                        <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
                            Got a technical issue? Want to send feedback about a beta feature? Need details about our Business plan? Let us know.
                        </p>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-12">
                        {/* Contact Info */}
                        <div className="flex flex-col justify-between">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Get in touch</h2>
                                <p className="mt-4 text-lg leading-8 text-gray-600">
                                    Our friendly team is always here to chat. We'd love to hear from you.
                                </p>

                                <dl className="mt-10 space-y-8 text-base leading-7 text-gray-600">
                                    <div className="flex gap-x-4">
                                        <div className="flex-none">
                                            <span className="sr-only">Email</span>
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                                <Mail className="h-6 w-6 text-white" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="pt-1.5">
                                            <h3 className="font-semibold text-gray-900">Email</h3>
                                            <a href="mailto:hello@example.com" className="hover:text-indigo-600 transition-colors">
                                                hello@example.com
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex gap-x-4">
                                        <div className="flex-none">
                                            <span className="sr-only">Address</span>
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                                <MapPin className="h-6 w-6 text-white" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="pt-1.5">
                                            <h3 className="font-semibold text-gray-900">Office</h3>
                                            <p>
                                                545 Mavis Island
                                                <br />
                                                Chicago, IL 99191
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-x-4">
                                        <div className="flex-none">
                                            <span className="sr-only">Phone</span>
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                                <Phone className="h-6 w-6 text-white" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="pt-1.5">
                                            <h3 className="font-semibold text-gray-900">Phone</h3>
                                            <a href="tel:+1 (555) 234-5678" className="hover:text-indigo-600 transition-colors">
                                                +1 (555) 234-5678
                                            </a>
                                        </div>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 ring-1 ring-gray-900/5 sm:p-10">
                            <h3 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Send us a message</h3>

                            {status.message && (
                                <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-800 ring-1 ring-green-600/20' : 'bg-red-50 text-red-800 ring-1 ring-red-600/20'
                                    }`}>
                                    {status.type === 'success' ? (
                                        <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    )}
                                    <p className="text-sm font-medium">{status.message}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-semibold leading-6 text-gray-900">
                                        Name
                                    </label>
                                    <div className="mt-2.5">
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold leading-6 text-gray-900">
                                        Email
                                    </label>
                                    <div className="mt-2.5">
                                        <input
                                            type="email"
                                            name="email"
                                            id="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-semibold leading-6 text-gray-900">
                                        Subject
                                    </label>
                                    <div className="mt-2.5">
                                        <input
                                            type="text"
                                            name="subject"
                                            id="subject"
                                            required
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50"
                                            placeholder="What is this regarding?"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-semibold leading-6 text-gray-900">
                                        Message
                                    </label>
                                    <div className="mt-2.5">
                                        <textarea
                                            name="message"
                                            id="message"
                                            rows={4}
                                            required
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white/50"
                                            placeholder="Tell us how we can help..."
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center items-center gap-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                                >
                                    {isLoading ? (
                                        <>
                                            <LoaderCard className="w-4 h-4 text-white" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            Send Message
                                            <Send className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </GridBackground>
    );
}
