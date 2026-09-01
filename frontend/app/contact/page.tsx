import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/page-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/contact/` → `blog.views.home_views.ContactView` → `blog/contact.html` */

export const metadata: Metadata = buildMetadata({
  title: "Contact Us — Blogermenia",
  description: "Questions or feedback about BlogerMenia? Get in touch.",
  path: urls.contact(),
});

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const success = Boolean((await searchParams).success);

  return (
    <>
      <PageHeader />
      <SiteSidebar active="contact" />

      <main className="pt-16 lg:pl-64 min-h-screen bg-slate-50">
        <div className="max-w-2xl px-8 sm:px-14 py-14">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <Link href={urls.home()} className="hover:text-slate-600 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span>Contact</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-slate-900">Get in touch</h1>
          <p className="text-slate-500 mb-10 text-lg">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>

          {success && (
            <div className="bg-brand-50 border border-brand-200 text-brand-700 px-6 py-4 rounded-xl mb-8 flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2 text-brand-500 shrink-0 mt-0.5">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <div>
                <h3 className="font-bold">Message sent successfully!</h3>
                <p className="text-sm mt-1 opacity-90">
                  Thank you for reaching out. We will get back to you as soon as possible.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
            <ContactForm />
          </div>
        </div>
      </main>
    </>
  );
}
