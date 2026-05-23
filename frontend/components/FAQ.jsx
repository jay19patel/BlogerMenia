"use client";

import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";

export default function FAQ() {
  const [openItem, setOpenItem] = useState(null);
  const [faqItems, setFaqItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await api.getFAQs();
        setFaqItems(response.faqs || []);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
        setFaqItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  const toggleItem = (id) => {
    setOpenItem(openItem === id ? null : id);
  };

  if (loading) {
    return (
      <section className="py-24 border-b border-border bg-gray-50/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoaderCard message="Querying knowledge base…" />
          </div>
        </div>
      </section>
    );
  }

  if (faqItems.length === 0) return null;

  return (
    <section className="py-24 border-b border-border bg-gray-50/50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 border-b-2 border-foreground pb-8 text-center md:text-left">
          <div className="inline-flex items-center text-sm font-mono text-gray-500 mb-6">
            <span className="bg-foreground text-background py-1 px-3 text-xs font-semibold uppercase tracking-widest border border-foreground mr-4">
              SYS-FAQ
            </span>
            System Diagnostics
          </div>
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight mb-4 uppercase">
            Frequently Asked Questions
          </h2>
          <p className="text-base font-mono text-gray-600 max-w-2xl">
            Common queries, platform limits, and operational directives for the BlogerMenia architecture.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-6">
          {faqItems.map((item, index) => {
            const id = item.id || item._id || index;
            const question = item.question || item.title || "";
            const answer = item.answer || item.content || "";
            const isOpen = openItem === id;

            return (
              <div
                key={id}
                className={`border-2 border-foreground bg-background transition-all duration-300 ${
                  isOpen 
                    ? "shadow-[8px_8px_0px_0px_rgba(88,28,135,1)] -translate-y-1" 
                    : "hover:shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:-translate-y-1"
                }`}
              >
                {/* Trigger */}
                <button
                  onClick={() => toggleItem(id)}
                  className="flex w-full items-center justify-between p-6 md:p-8 text-left focus:outline-none"
                >
                  <span className={`text-lg md:text-xl font-bold uppercase tracking-tight transition-colors duration-300 ${
                    isOpen ? "text-indigo-700" : "text-foreground"
                  }`}>
                    {question}
                  </span>
                  <div className={`shrink-0 w-8 h-8 md:w-10 md:h-10 border-2 border-foreground flex items-center justify-center transition-all duration-300 ${
                    isOpen 
                      ? "bg-foreground text-background" 
                      : "bg-background text-foreground group-hover:bg-gray-100"
                  }`}>
                    {isOpen ? <Minus className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                </button>

                {/* Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0">
                    <div className="h-0.5 w-12 bg-foreground mb-6" />
                    <p className="text-gray-700 font-mono text-sm leading-relaxed">
                      {answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
