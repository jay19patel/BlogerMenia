"use client";

import { useState, useEffect } from "react";
import { ChevronDown, HelpCircle, Plus, Minus } from "lucide-react";
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
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoaderCard message="Loading FAQs…" />
          </div>
        </div>
      </section>
    );
  }

  if (faqItems.length === 0) return null;

  return (
    <section className="py-24 overflow-hidden">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-6">
            FAQ
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about BlogerMenia
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqItems.map((item) => {
            const id = item.id || item._id;
            const question = item.question || item.title || "";
            const answer = item.answer || item.content || "";
            const isOpen = openItem === id;

            return (
              <div
                key={id}
                className={`group rounded-2xl border transition-all duration-300 ${isOpen
                  ? "border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-50/50"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50"
                  }`}
              >
                {/* Trigger */}
                <button
                  onClick={() => toggleItem(id)}
                  className="flex w-full items-center justify-between p-6 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-4">
                    <div className={`shrink-0 transition-colors duration-300 ${isOpen ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'}`}>
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <span className={`text-base font-bold transition-colors duration-300 ${isOpen ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {question}
                    </span>
                  </div>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-indigo-600 text-white rotate-180' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {/* Content */}
                <div
                  className={`overflow-hidden transition-all duration-500 ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="px-6 pb-6 pt-0 ml-10">
                    <div className="h-px bg-indigo-100 mb-6" />
                    <p className="text-gray-600 leading-relaxed font-medium">
                      {answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center p-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-xl shadow-indigo-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />

          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-3">
              Still have questions?
            </h3>
            <p className="text-indigo-100 mb-8 max-w-md mx-auto leading-relaxed">
              Our team is here to help! If you couldn't find your answer here, feel free to reach out to us directly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:support@blogermenia.com"
                className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-xl hover:bg-indigo-50 transition-all font-bold shadow-lg"
              >
                Email Support
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 bg-indigo-500/30 text-white border border-white/20 px-8 py-4 rounded-xl hover:bg-white/10 transition-all font-bold backdrop-blur-sm"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
