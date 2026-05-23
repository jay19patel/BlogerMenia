"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Users, TrendingUp, Eye, Heart } from "lucide-react";
import BlogCard from "@/components/BlogCard";
import HorizontalBlogCard from "@/components/HorizontalBlogCard";
import dynamic from "next/dynamic";
const Testimonial = dynamic(() => import("@/components/Testimonial"), { ssr: false });
import FAQ from "@/components/FAQ";
import { api } from "@/lib/api";
import LoaderCard from "@/components/ui/loader";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getImageUrl, formatDate } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  // Removed unused hero typing animation state
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [currentTypingIndex, setCurrentTypingIndex] = useState(-1);
  const [typingProgress, setTypingProgress] = useState("");

  // States for data
  const [featuredBlogs, setFeaturedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ active_users: 0, blogs_published: 0, total_views: 0 });

  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  const [topAuthors, setTopAuthors] = useState([]);
  const [authorsLoading, setAuthorsLoading] = useState(true);

  // Fetch all initial data
  useEffect(() => {
    const fetchHomeData = async () => {
      // 1. Fetch Featured Blogs
      try {
        const response = await api.getFeaturedBlogs();
        const blogs = response.results || response || [];
        setFeaturedBlogs(
          blogs.slice(0, 5).map((blog) => ({
            ...blog,
            category:
              blog.category_name ||
              (typeof blog.category === "string"
                ? blog.category
                : blog.category?.name),
            description: blog.excerpt || blog.subtitle || "",
            date: formatDate(blog.publishedDate || blog.created_at),
          }))
        );
      } catch (e) {
        console.error("Failed to fetch featured blogs:", e);
      } finally {
        setLoading(false);
      }

      // 2. Fetch Stats
      api.getStats().then((data) => {
        if (data) {
          setStats({
            active_users: data.total_authors || 0,
            blogs_published: data.total_blogs || 0,
            total_views: data.total_views || 0,
          });
        }
      }).catch((e) => console.error("Failed to fetch stats:", e));

      // 3. Fetch Playlists
      api.getPublicPlaylists().then((data) => {
        const results = data.results || data || [];
        setPlaylists(results.slice(0, 5));
      }).catch((e) => console.error("Failed to fetch playlists:", e))
        .finally(() => setPlaylistsLoading(false));

      // 4. Fetch Top Authors
      api.getTopAuthors().then((data) => {
        const results = data.results || data || [];
        setTopAuthors(results.slice(0, 5));
      }).catch((e) => console.error("Failed to fetch top authors:", e))
        .finally(() => setAuthorsLoading(false));
    };

    fetchHomeData();
  }, []);


  // Simple scripted chat simulation (alternating user/assistant)
  const scriptedConversation = useMemo(() => ([
    { role: "assistant", content: "Hey Jay Patel, what kind of blog would you like to create?" },
    { role: "user", content: "Create a blog on Python OOP concepts." },
    { role: "assistant", content: "Creating your Python OOP blog…" },
    { role: "assistant", content: "Done! \"Python OOP Fundamentals\" — classes, inheritance, polymorphism with examples." },
    { role: "user", content: "Add a short introduction as well." },
    { role: "assistant", content: "Intro: Object-Oriented Programming (OOP) in Python helps structure code using classes and objects for cleaner, reusable designs." },
    { role: "user", content: "Now, make a blog on JavaScript async/await." },
    { role: "assistant", content: "Creating your JavaScript async/await blog…" },
    { role: "assistant", content: "Done! \"JavaScript Async/Await Explained\" — promises, async functions, error handling with examples." },
  ]), []);

  // Auto-scroll to latest message
  const messagesRef = useRef(null);
  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [displayedMessages, currentTypingIndex, typingProgress]);

  const fetchSuggestions = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await api.getBlogs(query, 0, 4);
      setSearchResults(response.blogs || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchSuggestions(val);
  };

  const handleSearchBlogs = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      return;
    }
    setIsSearching(true);
    router.push(`/blogs?search=${encodeURIComponent(searchQuery.trim())}`);
  };



  // Auto-play the scripted conversation one-by-one (deterministic, no polling)
  useEffect(() => {
    let isCancelled = false;

    const typeMessage = (fullText, role) => new Promise((resolve) => {
      const align = role === "user" ? "right" : "left";

      // Add message in typing state at the end
      setDisplayedMessages(prev => {
        const next = [...prev, { role, align, content: fullText, displayedContent: "", isTyping: true }];
        setCurrentTypingIndex(next.length - 1);
        setTypingProgress("");
        return next;
      });

      // Drive typing with a local interval independent of render cycles
      let i = 0;
      const speed = 20; // ms per char
      const tick = () => {
        if (isCancelled) return resolve();
        i += 1;
        const slice = fullText.slice(0, i);
        setTypingProgress(slice);
        if (i >= fullText.length) {
          // Commit final state
          setDisplayedMessages(prev => {
            const lastIndex = prev.length - 1;
            return prev.map((m, idx) => idx === lastIndex ? { ...m, isTyping: false, displayedContent: fullText } : m)
          });
          setCurrentTypingIndex(-1);
          setTypingProgress("");
          return resolve();
        }
        setTimeout(tick, speed);
      };
      setTimeout(tick, speed);
    });

    const play = async () => {
      // Reset
      setDisplayedMessages([]);
      setCurrentTypingIndex(-1);
      setTypingProgress("");

      for (let i = 0; i < scriptedConversation.length; i++) {
        if (isCancelled) break;
        const msg = scriptedConversation[i];
        await typeMessage(msg.content, msg.role);
        await new Promise(r => setTimeout(r, 350));
      }
    };

    const start = setTimeout(() => play(), 350);
    return () => { isCancelled = true; clearTimeout(start); };
  }, [scriptedConversation]);
  return (
    <>
      {/* Hero Section */}
      <section className="pt-0 lg:pt-12 lg:px-8 h-full overflow-visible border-b border-border">
        <div className="bg-background border border-border py-12 lg:py-20 mx-5 lg:mx-0 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-14 items-center lg:grid-cols-12 lg:gap-24">
              <div className="w-full xl:col-span-6 lg:col-span-6">
                <div className="flex items-center text-sm font-mono text-gray-500 justify-center lg:justify-start mb-6">
                  <span className="bg-foreground text-background py-1 px-3 text-xs font-semibold uppercase tracking-widest border border-foreground mr-4">
                    SYS-01
                  </span>
                  AI-Powered Technical Publishing
                </div>
                <h1 className="py-4 text-center text-foreground font-extrabold text-5xl lg:text-left leading-tight font-sans tracking-tight">
                  Transform ideas into <br />
                  <span className="text-gray-500 font-serif italic">robust tech blogs</span> with AI
                </h1>
                <p className="text-gray-600 text-lg text-center lg:text-left mt-4 mb-8 font-mono text-sm leading-relaxed max-w-lg">
                  Deploy professional, insightful blogs powered by specialized AI. Scale your knowledge distribution with zero fuss and instant rendering.
                </p>
                <div className="relative my-8">
                  <form onSubmit={handleSearchBlogs}>
                    <div className="relative flex items-center h-auto md:h-14 flex-col md:flex-row justify-between border-2 border-foreground bg-background focus-within:ring-2 focus-within:ring-foreground transition-all">
                      <input
                        type="text"
                        name="search"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="query search index..."
                        className="text-sm font-mono flex-1 py-4 px-6 bg-transparent placeholder:text-gray-400 focus:outline-none w-full text-foreground"
                      />
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="bg-foreground py-4 px-8 text-sm font-bold text-background hover:bg-gray-800 transition-colors w-full md:w-auto uppercase tracking-wider font-mono disabled:opacity-50"
                      >
                        {isSearching ? "Exec..." : "Exec"}
                      </button>
                    </div>
                  </form>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && searchQuery.trim() !== "" && (
                    <div className="absolute top-full left-0 right-0 mt-0 bg-background border-2 border-t-0 border-foreground shadow-sm z-50 max-h-80 overflow-y-auto">
                      {searchResults.map((blog) => {
                        const authorIdentifier = blog.author?.email || blog.author_email || blog.authorUsername;
                        const blogUrl = authorIdentifier ? `/blogs/${encodeURIComponent(authorIdentifier)}/${blog.slug}` : `/blogs/${blog.slug}`;
                        const displayDate = formatDate(blog.publishedDate || blog.created_at);

                        return (
                          <Link
                            key={blog.slug}
                            href={blogUrl}
                            className="block px-5 py-3 border-b border-border last:border-b-0 hover:bg-gray-100 transition-colors group"
                          >
                            <div className="flex justify-between items-start gap-4">
                              <p className="text-foreground font-semibold text-sm group-hover:underline transition-all line-clamp-1">{blog.title}</p>
                              <span className="text-[10px] font-mono text-gray-500 uppercase whitespace-nowrap mt-1">{displayDate}</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-6 mt-10 border-t border-border pt-8">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Active Users</p>
                    <p className="text-xl font-bold text-foreground font-mono">{stats.active_users > 0 ? stats.active_users.toLocaleString() : '0'}</p>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Deployments</p>
                    <p className="text-xl font-bold text-foreground font-mono">{stats.blogs_published > 0 ? stats.blogs_published.toLocaleString() : '0'}</p>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Total Hits</p>
                    <p className="text-xl font-bold text-foreground font-mono">{stats.total_views > 0 ? stats.total_views.toLocaleString() : '0'}</p>
                  </div>
                </div>
              </div>

              <div className="w-full lg:col-span-6 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-xl">
                  {/* Terminal Style Card */}
                  <div className="relative border-2 border-foreground bg-foreground p-0 shadow-[8px_8px_0px_0px_rgba(88,28,135,1)]">
                    {/* Terminal Header */}
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-700 bg-gray-900">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div className="flex-1 ml-4 text-center">
                        <p className="text-[10px] text-gray-400 font-mono">root@blogermenia:~</p>
                      </div>
                    </div>

                    {/* Chat-like generator inside terminal */}
                    <div className="flex flex-col gap-4 bg-[#0D1117] p-4 h-[320px] overflow-y-auto">
                      <div ref={messagesRef} className="flex flex-col gap-4 font-mono text-xs">
                        {displayedMessages.map((m, idx) => {
                          let displayText = m.displayedContent;
                          const isTypingThisMessage = idx === currentTypingIndex && m.isTyping;
                          if (isTypingThisMessage) {
                            displayText = typingProgress;
                          }

                          return (
                            <div key={idx} className={m.align === "right" ? "flex justify-end" : "flex justify-start"}>
                              <div className={
                                m.align === "right"
                                  ? "max-w-[90%] text-green-400 px-0 py-1"
                                  : "max-w-[90%] text-gray-300 px-0 py-1"
                              }>
                                <span className="text-gray-500 mr-2">{m.align === "right" ? ">" : "$"}</span>
                                {m.pending ? (
                                  <span className="inline-flex items-center gap-1">
                                    processing
                                    <span className="inline-flex gap-1">
                                      <span className="w-1 h-1 bg-current animate-pulse"></span>
                                      <span className="w-1 h-1 bg-current animate-pulse delay-75"></span>
                                      <span className="w-1 h-1 bg-current animate-pulse delay-150"></span>
                                    </span>
                                  </span>
                                ) : (
                                  <div className="inline-block whitespace-pre-wrap">
                                    {displayText}
                                    {isTypingThisMessage && displayText.length < m.content.length && (
                                      <span className="inline-block w-2 h-3 bg-gray-400 ml-1 animate-pulse"></span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 border-b-2 border-foreground pb-8">
            <h2 className="text-4xl font-extrabold text-foreground tracking-tight mb-4 uppercase">
              Engineered for Scale
            </h2>
            <p className="text-base font-mono text-gray-500 max-w-2xl">
              Transform your thoughts into well-crafted blogs effortlessly. Share knowledge, engage with readers, and build your digital presence on a platform that respects developers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-foreground bg-foreground">
            <div className="bg-background border-r-2 border-b-2 md:border-b-0 border-foreground p-8 flex flex-col hover:bg-indigo-50 transition-colors">
              <div className="text-indigo-600 mb-6 border-2 border-foreground p-3 w-fit shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] bg-white">
                <BookOpen className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4 uppercase">
                AI Generation
              </h3>
              <p className="text-sm font-mono text-gray-600 flex-grow leading-relaxed">
                Create engaging, well-structured blogs in minutes. Leverage our LLM pipelines to banish writer&apos;s block.
              </p>
            </div>

            <div className="bg-background border-r-2 border-b-2 md:border-b-0 border-foreground p-8 flex flex-col hover:bg-purple-50 transition-colors">
              <div className="text-purple-600 mb-6 border-2 border-foreground p-3 w-fit shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] bg-white">
                <Users className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4 uppercase">
                Audience Distribution
              </h3>
              <p className="text-sm font-mono text-gray-600 flex-grow leading-relaxed">
                Reach and engage with readers worldwide. Build your thought leadership through precision content sharing.
              </p>
            </div>

            <div className="bg-background p-8 flex flex-col hover:bg-pink-50 transition-colors">
              <div className="text-pink-600 mb-6 border-2 border-foreground p-3 w-fit shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] bg-white">
                <TrendingUp className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4 uppercase">
                Curated Feeds
              </h3>
              <p className="text-sm font-mono text-gray-600 flex-grow leading-relaxed">
                Explore trending tech blogs. Learn, get inspired, and stay updated with fresh architectural perspectives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Blogs Section */}
      <section className="py-20 border-b border-border bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b-2 border-foreground pb-6">
            <div>
              <h2 className="text-3xl font-extrabold text-foreground uppercase tracking-tight">Top Queries</h2>
              <p className="text-gray-500 font-mono text-sm mt-2">Highest throughput reads from the cluster.</p>
            </div>
            <Link href="/blogs" className="text-sm font-bold text-background bg-foreground px-4 py-2 hover:bg-gray-800 uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
              View All Logs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-6 bg-background border-2 border-foreground p-4 animate-pulse">
                  <div className="md:w-1/3 h-48 md:h-40 bg-gray-200"></div>
                  <div className="flex-1 space-y-4 py-2">
                    <div className="h-6 bg-gray-200 w-3/4"></div>
                    <div className="h-4 bg-gray-200 w-1/2"></div>
                    <div className="h-4 bg-gray-200 w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredBlogs.length > 0 ? (
            <div className="space-y-6">
              {featuredBlogs.map((blog) => (
                <HorizontalBlogCard key={blog.slug} blog={blog} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300">
              <p className="text-gray-500 font-mono">No telemetry data available.</p>
            </div>
          )}
        </div>
      </section>

      {/* Public Playlists Section */}
      <section className="py-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b-2 border-foreground pb-6">
            <div>
              <h2 className="text-3xl font-extrabold text-foreground uppercase tracking-tight">Tracks</h2>
              <p className="text-gray-500 font-mono text-sm mt-2">Curated sequential documentation series.</p>
            </div>
            <Link href="/playlists" className="text-sm font-bold text-background bg-foreground px-4 py-2 hover:bg-gray-800 uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
              List Tracks <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {playlistsLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full border-2 border-foreground rounded-none" />
              ))}
            </div>
          ) : playlists.length > 0 ? (
            <div className="space-y-6">
              {playlists.map((playlist) => (
                <Link key={playlist.slug} href={`/playlists/${playlist.owner?.email || playlist.owner?.username}/${playlist.slug}`} className="group block bg-background border-2 border-foreground overflow-hidden hover:shadow-[8px_8px_0px_0px_rgba(88,28,135,1)] transition-all md:h-48 relative">
                  <div className="flex flex-col md:flex-row h-full">
                    <div className="md:w-1/3 relative border-b-2 md:border-b-0 md:border-r-2 border-foreground bg-gray-100 flex items-center justify-center shrink-0">
                      {playlist.cover_image || playlist.thumbnail ? (
                        <Image
                          src={getImageUrl((playlist.cover_image || playlist.thumbnail)?.file_path || (playlist.cover_image || playlist.thumbnail))}
                          alt={playlist.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-all duration-500"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-foreground flex items-center justify-center p-4 text-center text-background font-mono font-bold text-sm">
                          {playlist.name}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono px-2 py-0.5 border border-indigo-200">TRACK</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-foreground group-hover:text-indigo-600 transition-colors mb-2 uppercase tracking-tight">
                        {playlist.name}
                      </h3>
                      <p className="text-gray-600 font-mono text-xs line-clamp-2 mb-6 leading-relaxed max-w-2xl">
                        {playlist.description || "Explore this carefully curated collection of articles focused on specific topics."}
                      </p>
                      <div className="flex items-center gap-8 mt-auto border-t border-gray-200 pt-4">
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-foreground font-mono">{playlist.blog_count || 0}</span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mt-1">Articles</span>
                        </div>
                        <div className="h-8 w-px bg-gray-200"></div>
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-foreground font-mono">{(playlist.total_views || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mt-1">Total Views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300">
              <p className="text-gray-500 font-mono">No tracks found.</p>
            </div>
          )}
        </div>
      </section>

      {/* Top Authors Section */}
      <section className="py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b-2 border-foreground pb-6">
            <div>
              <h2 className="text-3xl font-extrabold text-foreground uppercase tracking-tight">Architects</h2>
              <p className="text-gray-500 font-mono text-sm mt-2">The engineers behind the documentation.</p>
            </div>
            <Link href="/creators" className="text-sm font-bold text-background bg-foreground px-4 py-2 hover:bg-gray-800 uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
              All Architects <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {authorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full border-2 border-foreground rounded-none" />
              ))}
            </div>
          ) : topAuthors.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {topAuthors.map((author) => (
                <Link
                  key={author.email}
                  href={`/blogs/${author.email}`}
                  className="group block bg-background border-2 border-foreground hover:shadow-[6px_6px_0px_0px_rgba(88,28,135,1)] transition-all md:h-48"
                >
                  <div className="flex flex-col sm:flex-row h-full">
                    {/* Left Side: Avatar */}
                    <div className="relative w-full sm:w-1/3 shrink-0 border-b-2 sm:border-b-0 sm:border-r-2 border-foreground bg-indigo-50 flex flex-col justify-center items-center p-6">
                      <div className="w-20 h-20 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] bg-white overflow-hidden relative">
                        {author.profile_image ? (
                          <Image
                            src={getImageUrl(author.profile_image?.file_path || author.profile_image)}
                            alt={author.full_name || author.email}
                            fill
                            sizes="80px"
                            className="object-cover transition-all"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-foreground flex items-center justify-center text-background">
                            <span className="font-mono font-bold text-4xl uppercase tracking-widest">
                              {(author.full_name?.[0] || author.email?.[0] || 'U')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Content */}
                    <div className="flex-1 flex flex-col justify-center p-6">
                      <div className="mb-4 border-b border-gray-200 pb-4">
                        <h3 className="font-extrabold text-xl text-foreground uppercase truncate group-hover:text-indigo-600 transition-colors tracking-tight">
                          {author.full_name || author.email?.split('@')[0] || "User"}
                        </h3>
                        <p className="font-mono text-[10px] text-gray-500 truncate mb-2 uppercase">
                          {author.email}
                        </p>
                        {author.headline && (
                          <p className="text-xs text-gray-600 line-clamp-1 italic font-serif">
                            &quot;{author.headline}&quot;
                          </p>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="flex flex-row items-center gap-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-lg text-foreground font-mono leading-none">
                            {author.blog_count || 0}
                          </span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mt-1">
                            Deployments
                          </span>
                        </div>
                        <div className="h-6 w-px bg-gray-200"></div>
                        <div className="flex flex-col">
                          <span className="font-bold text-lg text-foreground font-mono leading-none">
                            {(author.total_views || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mt-1">
                            Hits
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300">
              <p className="text-gray-500 font-mono">No authors found.</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonial Section */}
      <Testimonial />

      {/* FAQ Section */}
      <FAQ />
    </>
  );
}
