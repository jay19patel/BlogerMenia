import type { Metadata } from "next";
import Link from "next/link";

import { AuthSwitch, IfAnonymous } from "@/components/auth-gate";
import { FaqAccordion } from "@/components/faq-accordion";
import { LinkedInIcon, LinkedInPostedBadge } from "@/components/icons";
import { AuthorAvatar, MediaFrame } from "@/components/media";
import { CategoryBadge } from "@/components/category-badge";
import { blogs as blogsApi, playlists as playlistsApi, users as usersApi } from "@/lib/api";
import { PageShell } from "@/components/page-shell";
import { buildMetadata } from "@/lib/seo";
import { urls } from "@/lib/urls";

/** Django: `/` → `blog.views.home_views.HomeView` → `blog/home.html` */

export const metadata: Metadata = buildMetadata({
  title: "BlogerMenia — Ideas worth writing down",
  path: urls.home(),
});

const TESTIMONIALS = [
  {
    quote:
      "\"BlogerMenia gave me a place to share my thoughts on design systems. The writing experience is clean and distraction-free — exactly what I needed.\"",
    initial: "S",
    initialClass: "bg-brand-500",
    name: "Sana Mehra",
    role: "Product Designer",
  },
  {
    quote:
      "\"I've published 12 articles on BlogerMenia and the reader engagement has been incredible. The platform genuinely values thoughtful writing.\"",
    initial: "R",
    initialClass: "bg-slate-700",
    name: "Rohan Kapoor",
    role: "Full Stack Developer",
  },
  {
    quote:
      "\"The playlist feature is brilliant. I curated a reading list for my team on system design, and they loved having it in one place.\"",
    initial: "P",
    initialClass: "bg-purple-500",
    name: "Priya Nair",
    role: "Engineering Manager",
  },
];

function QuoteIcon() {
  return (
    <svg className="w-7 h-7 text-brand-500 mb-4" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M10 8C5.582 8 2 11.582 2 16c0 3.866 2.476 7.16 5.937 8.387A8.003 8.003 0 0 1 10 24c0 2.21-1.343 4-3 4H6v2h1c2.478 0 4.456-1.61 5.448-4.002C14.796 25.23 16 22.776 16 20v-4c0-4.418-2.686-8-6-8zm16 0c-3.314 0-6 3.582-6 8v4c0 2.776 1.204 5.23 3.552 5.998C20.544 28.39 22.522 30 25 30h1v-2h-1c-1.657 0-3-1.79-3-4a8.003 8.003 0 0 1 2.063.387C28.524 23.16 31 19.866 31 16c0-4.418-3.582-8-8-8z" />
    </svg>
  );
}

function ArrowRight({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default async function HomePage() {
  // `HomeView.get_context_data` — the counts and the three lists it assembles.
  const [allBlogs, topRead, allPlaylists, featuredUsers] = await Promise.all([
    blogsApi.listBlogs({ pageSize: 1 }),
    blogsApi.listBlogs({ ordering: "-read_count", pageSize: 3 }),
    playlistsApi.listPlaylists({ pageSize: 1 }),
    usersApi.listUsers(),
  ]);

  const total_blogs = allBlogs.count;
  const total_playlists = allPlaylists.count;
  const total_users = featuredUsers.length;
  const top_blogs = topRead.blogs;
  const featured_users = featuredUsers.slice(0, 6);

  const stats = [
    {
      value: total_blogs,
      label: "Articles",
      icon: (
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      ),
    },
    {
      value: total_users,
      label: "Writers",
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
    },
    {
      value: total_playlists,
      label: "Playlists",
      icon: (
        <>
          <path d="m16 6 4 14" />
          <path d="M12 6v14" />
          <path d="M8 8v12" />
          <path d="M4 4v16" />
        </>
      ),
    },
  ];

  return (
    <>
      <PageShell active="home">
        {/* HERO */}
        <section className="relative overflow-hidden px-5 sm:px-14 py-20 border-b border-slate-100/80 bg-linear-to-b from-slate-50/50 via-white to-white">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-indigo-50/80 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-brand-100/60">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
              Curated stories &amp; engineering insights
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif tracking-tight leading-[1.08] mb-6 text-slate-900 font-semibold">
              Ideas &amp; Stories worth
              <br />
              <span className="italic text-brand-600 font-serif font-normal">writing down.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8 max-w-2xl font-sans">
              BlogerMenia is where engineers, creators, and curious minds publish thoughtful
              perspectives on technology, design, and software architecture.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href={urls.blogList()}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-xs hover:shadow-sm"
              >
                Explore Articles
                <ArrowRight />
              </Link>
              <AuthSwitch
                anonymous={
                  <Link
                    href={urls.accountSignup()}
                    className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
                  >
                    Start writing for free
                  </Link>
                }
                authenticated={
                  <Link
                    href={urls.blogCreate()}
                    className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    Write an article
                  </Link>
                }
              />
            </div>
          </div>

          {/* Stats pills */}
          <div className="relative mt-12 flex flex-wrap items-center gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 bg-white border border-slate-200/70 rounded-full pl-2 pr-5 py-1.5 shadow-xs"
              >
                <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {stat.icon}
                  </svg>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-slate-900 mono">{stat.value}</span>
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TOP BLOGS */}
        {top_blogs.length > 0 && (
          <section className="px-5 sm:px-14 py-16 border-b border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-1.5">MOST READ</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Top Blogs</h2>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-slate-100">
              {top_blogs.map((blog, index) => (
                <Link
                  key={blog.slug}
                  href={urls.blogDetail(blog.slug)}
                  className="group flex items-center gap-5 py-5 hover:bg-slate-50/60 -mx-3 px-3 rounded-xl transition-colors"
                >
                  <span className="text-3xl font-extrabold text-slate-200 mono w-10 shrink-0 select-none">
                    {index + 1}
                  </span>
                  <MediaFrame
                    src={blog.image}
                    alt={blog.title}
                    avatarSvg={blog.avatar_svg}
                    imgClassName="w-full h-full object-cover rounded-xl"
                    className="h-14 w-20 shrink-0 rounded-xl"
                  />
                  <div className="flex-1 min-w-0">
                    <CategoryBadge category={blog.category} fallback={null} />
                    <h3 className="font-bold text-slate-900 text-base mt-1.5 truncate group-hover:text-brand-700 transition-colors">
                      {blog.title}
                      <LinkedInPostedBadge
                        postedOnLinkedin={blog.posted_on_linkedin}
                        linkedinPostUrl={blog.linkedin_post_url}
                      />
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {blog.author.display_name} · {blog.read_count} reads · {blog.like_count} likes
                    </p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* COMMUNITY */}
        <section className="px-5 sm:px-14 py-16 bg-slate-50/60 border-b border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-1.5">MEET THE AUTHORS</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Community</h2>
            </div>
            <Link href={urls.userList()} className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1.5">
              All writers
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured_users.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-slate-400 text-sm">No members yet.</div>
            ) : (
              featured_users.map((member) => (
                <div
                  key={member.username}
                  className="group relative flex items-center gap-4 bg-white border border-slate-100 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/50 rounded-2xl p-5 transition-all"
                >
                  <Link href={urls.userProfile(member.username)} className="absolute inset-0 z-0 rounded-2xl">
                    <span className="sr-only">View {member.username}</span>
                  </Link>
                  <AuthorAvatar
                    user={member}
                    className="size-14 shrink-0 ring-2 ring-slate-50 transition-colors group-hover:ring-brand-100"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
                        {member.display_name}
                      </p>
                      {member.linkedin_url ? (
                        <a
                          href={member.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-10 text-[#0A66C2] hover:text-[#004182] transition-colors shrink-0"
                          title="LinkedIn Profile"
                        >
                          <LinkedInIcon />
                        </a>
                      ) : member.has_linkedin_oauth ? (
                        <div className="text-[#0A66C2]/70 cursor-help shrink-0" title="LinkedIn Connected">
                          <LinkedInIcon />
                        </div>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">@{member.username}</p>
                    {member.bio && <p className="text-xs text-slate-500 mt-1 truncate">{member.bio}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="px-5 sm:px-14 py-16 border-b border-slate-100">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2">FROM OUR WRITERS</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">What people are saying</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial) => (
              <div key={testimonial.name} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
                <QuoteIcon />
                <p className="text-sm text-slate-600 leading-relaxed mb-6">{testimonial.quote}</p>
                <div className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-full ${testimonial.initialClass} flex items-center justify-center font-bold text-white text-sm`}>
                    {testimonial.initial}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-xs text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="px-5 sm:px-14 py-16 border-b border-slate-100">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 mb-2">GOT QUESTIONS?</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Frequently Asked Questions
              </h2>
            </div>
            <FaqAccordion />
          </div>
        </section>

        {/* CTA */}
        <IfAnonymous>
          <section className="px-5 sm:px-14 py-20 text-center">
            <div className="max-w-lg mx-auto">
              <span className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 mx-auto mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
                Ready to start writing?
              </h2>
              <p className="text-slate-500 leading-relaxed mb-8">
                Join hundreds of writers sharing their knowledge on BlogerMenia. It&apos;s free, always.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href={urls.accountSignup()} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-7 py-3 rounded-xl transition-colors">
                  Create your account
                  <ArrowRight />
                </Link>
                <Link href={urls.blogList()} className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-7 py-3 rounded-xl transition-colors">
                  Browse first
                </Link>
              </div>
            </div>
          </section>
        </IfAnonymous>
      </PageShell>
    </>
  );
}
