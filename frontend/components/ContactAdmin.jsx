"use client";

import { useState } from "react";
import { Mail, Phone, AlertCircle, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ContactAdmin({ children, open, onOpenChange }) {
  const adminEmail = "admin@BlogerMenia.com";
  const adminPhone = "+1 (555) 123-4567";
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dialogProps = {};
  if (open !== undefined && onOpenChange !== undefined) {
    dialogProps.open = open;
    dialogProps.onOpenChange = onOpenChange;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error("Please enter your query");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      toast.success("Query successfully sent!");
      setQuery("");
      setIsSubmitting(false);
      if (onOpenChange) {
        onOpenChange(false);
      }
    }, 1000);
  };

  return (
    <Dialog {...dialogProps}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-4xl font-bold text-gray-900 mb-3">
            Under <span className="text-indigo-600">Development</span>
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            This feature is currently under development. For password reset assistance, please contact our admin team directly.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Admin Email and Phone - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Admin Email */}
            <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-1">Email</p>
                <a
                  href={`mailto:${adminEmail}`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline break-all"
                >
                  {adminEmail}
                </a>
              </div>
            </div>

            {/* Admin Phone */}
            <div className="flex items-start gap-4 p-4 bg-violet-50 rounded-lg border border-violet-100">
              <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-1">Phone</p>
                <a
                  href={`tel:${adminPhone.replace(/[^0-9+]/g, '')}`}
                  className="text-sm text-violet-600 hover:text-violet-700 hover:underline"
                >
                  {adminPhone}
                </a>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              Our team is available 24/7 to assist you with any account-related issues.
            </p>
          </div>

          {/* Query Input */}
          <div className="pt-4 border-t border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="query" className="block text-sm font-semibold text-gray-900 mb-2">
                  Send us a message
                </label>
                <textarea
                  id="query"
                  rows={3}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your query or message..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Send className="w-4 h-4 animate-pulse" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Query
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

