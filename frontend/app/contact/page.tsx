import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContactForm } from "@/components/contact-form";
import { PageContainer, PageShell } from "@/components/page-shell";
import { Mail01, MarkerPin01, MessageChatCircle } from "@untitledui/icons";
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
      <PageShell active="contact" className="min-h-screen relative bg-slate-50">
        {/* Premium Background Elements (Light Mode) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-20 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl" />
        </div>

        <PageContainer className="relative z-10 max-w-6xl py-8 sm:py-12 lg:py-16">
          <Breadcrumbs
            items={[{ name: "Home", href: urls.home() }, { name: "Contact" }]}
            className="mb-8"
          />

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column: Text & Info */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-600 w-fit mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider">We&apos;re online</span>
              </div>

              <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight">
                Let&apos;s start a <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-brand-600 to-purple-600">conversation</span>
              </h1>
              <p className="text-slate-500 mb-12 text-lg leading-relaxed max-w-lg">
                Have a question, feedback, or a brilliant idea? We&apos;d love to hear from you. Drop us a message and our team will get back to you shortly.
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-brand-600 shadow-xs">
                    <Mail01 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-semibold mb-1">Email us</h3>
                    <p className="text-slate-500 text-sm">Our friendly team is here to help.</p>
                    <a href="mailto:hello@blogermenia.com" className="text-brand-600 font-medium text-sm mt-1 block hover:text-brand-700 transition-colors">hello@blogermenia.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-brand-600 shadow-xs">
                    <MessageChatCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-semibold mb-1">Live chat</h3>
                    <p className="text-slate-500 text-sm">Available Mon-Fri, 9am to 5pm EST.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-brand-600 shadow-xs">
                    <MarkerPin01 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-semibold mb-1">Office</h3>
                    <p className="text-slate-500 text-sm">Come say hello at our HQ.</p>
                    <p className="text-slate-600 text-sm mt-1">100 Smith Street<br />Collingwood VIC 3066 AU</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-b from-brand-100 to-purple-100 rounded-3xl blur-xl opacity-60 transform -rotate-1" />
              <div className="relative bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50">
                <ContactForm initialSuccess={success} />
              </div>
            </div>
          </div>
        </PageContainer>
      </PageShell>
    </>
  );
}
