"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Mail, MapPin, Phone, Send, Loader2, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const INPUT_CLASS = "w-full px-3 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground text-foreground text-sm";

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
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
            toast.error(error.message || "Failed to send message.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-14">
                    <h1 className="text-4xl font-bold text-foreground mb-3">Contact Us</h1>
                    <p className="text-muted-foreground text-base max-w-xl mx-auto">
                        Have a question or feedback? We&apos;d love to hear from you.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Contact Info */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-card border border-border rounded-xl p-7">
                            <h2 className="text-lg font-semibold text-foreground mb-5 pb-4 border-b border-border flex items-center gap-2">
                                <MessageSquare className="size-4 text-primary" />
                                Get in Touch
                            </h2>
                            <div className="space-y-5">
                                {[
                                    { icon: Mail, label: "Email", content: <a href="mailto:hello@blogermenia.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">hello@blogermenia.com</a> },
                                    { icon: Phone, label: "Phone", content: <a href="tel:+15552345678" className="text-sm text-muted-foreground hover:text-primary transition-colors">+1 (555) 234-5678</a> },
                                    { icon: MapPin, label: "Address", content: <p className="text-sm text-muted-foreground">545 Mavis Island, Chicago,<br />IL 99191, USA</p> },
                                ].map(({ icon: Icon, label, content }) => (
                                    <div key={label} className="flex items-start gap-3">
                                        <div className="bg-primary/10 text-primary rounded-lg p-2 shrink-0">
                                            <Icon className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-foreground mb-0.5">{label}</p>
                                            {content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-primary rounded-xl p-7 text-primary-foreground">
                            <Clock className="size-6 mb-3 opacity-80" />
                            <h3 className="text-base font-semibold mb-2">Support Hours</h3>
                            <p className="text-primary-foreground/80 text-sm leading-relaxed">
                                Our team is available Monday through Friday. We&apos;ll respond within 24 hours.
                            </p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-8">
                        <div className="bg-card border border-border rounded-xl p-8">
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Name</label>
                                    <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Your full name" className={INPUT_CLASS} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Email</label>
                                    <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="you@example.com" className={INPUT_CLASS} />
                                </div>
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Subject</label>
                                    <input type="text" name="subject" required value={formData.subject} onChange={handleChange} placeholder="What's this regarding?" className={INPUT_CLASS} />
                                </div>
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Message</label>
                                    <textarea name="message" required rows={6} value={formData.message} onChange={handleChange} placeholder="Tell us how we can help..." className={`${INPUT_CLASS} resize-none`} />
                                </div>
                                <div className="sm:col-span-2 pt-2">
                                    <Button type="submit" disabled={isLoading} size="lg" className="w-full sm:w-auto">
                                        {isLoading ? (
                                            <><Loader2 className="size-4 animate-spin" />Sending...</>
                                        ) : (
                                            <>Send Message<Send className="size-4" /></>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
