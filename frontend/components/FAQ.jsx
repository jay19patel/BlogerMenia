"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
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

  if (loading) {
    return (
      <section className="py-20 border-b border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-80">
            <LoaderCard message="Loading FAQs…" />
          </div>
        </div>
      </section>
    );
  }

  if (faqItems.length === 0) return null;

  return (
    <section className="py-20 border-b border-border bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center md:text-left">
          <span className="inline-flex items-center bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium mb-4">
            FAQ
          </span>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-base max-w-xl">
            Common questions about BlogerMenia, answered.
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="space-y-0">
          {faqItems.map((item, index) => {
            const id = String(item.id || item._id || index);
            const question = item.question || item.title || "";
            const answer = item.answer || item.content || "";

            return (
              <AccordionItem key={id} value={id}>
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>{answer}</AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
}
