"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
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
        console.log("FAQ API Response:", response);
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
      <section className="py-24 bg-white/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative h-40 sm:h-48 lg:h-56">
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderCard message="Loading FAQs…" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-white/50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-sm text-gray-500 font-medium mb-4 block">
            FAQ
          </span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about BlogerMenia
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No FAQs available at the moment.</p>
            </div>
          ) : (
            faqItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border bg-white px-6 py-1 transition-all duration-200 ${
                openItem === item.id
                  ? "border-indigo-600 ring-2 ring-indigo-600/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Trigger */}
              <button
                onClick={() => toggleItem(item.id)}
                className="flex w-full items-center justify-between py-4 text-left focus:outline-none"
              >
                <span className="text-[15px] leading-6 font-semibold text-gray-900">
                  {item.question || item.title}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ml-4 ${
                    openItem === item.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Content */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openItem === item.id ? "max-h-96 pb-4" : "max-h-0"
                }`}
              >
                <p className="text-gray-600 leading-relaxed">{item.answer || item.content}</p>
              </div>
            </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center p-8 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-4">
            Can't find the answer you're looking for? Please chat with our friendly team.
          </p>
          <a
            href="mailto:support@BlogerMenia.com"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}
