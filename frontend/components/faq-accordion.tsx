"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** The FAQ section of `blog/home.html`, including its single-open behaviour. */

const FAQ_ITEMS = [
  {
    question: "Is BlogerMenia free to use?",
    answer:
      "Yes, BlogerMenia is completely free for readers and writers. Create an account and start publishing in minutes. There are no hidden fees or paywalls.",
  },
  {
    question: "What kind of content can I publish?",
    answer:
      "You can write about anything — technology, design, business, personal growth, science, or creative writing. We welcome all thoughtful, original content that adds value for readers.",
  },
  {
    question: "What are playlists?",
    answer:
      "Playlists are curated collections of blogs. You can create playlists to group related articles together — great for series, reading lists, or topic-based collections. Share them with your audience or keep them for personal use.",
  },
  {
    question: "Can I connect my LinkedIn account?",
    answer:
      "Yes! You can sign in with LinkedIn or connect your LinkedIn profile from your account settings. This adds credibility to your profile and makes it easier for readers to connect with you professionally.",
  },
  {
    question: "How do I get more readers?",
    answer:
      "Focus on quality, publish consistently, and use categories so readers can discover your work. Sharing your articles on LinkedIn and other platforms also helps grow your audience on BlogerMenia.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question} className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="faq-btn w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-slate-900 hover:bg-slate-50 transition-colors text-sm"
            >
              {item.question}
              <svg
                className="faq-icon w-4 h-4 text-slate-400 shrink-0 ml-4 transition-transform"
                style={isOpen ? { transform: "rotate(180deg)" } : undefined}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <div
              className={cn(
                "faq-panel px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4",
                !isOpen && "hidden",
              )}
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
