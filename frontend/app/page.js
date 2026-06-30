"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Users, TrendingUp, Eye, Heart, Bookmark } from "lucide-react";
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
import { getBlogDate, getImageUrl, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
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
            date: formatDate(getBlogDate(blog), "Date"),
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

  // Fetch the signed-in user's bookmarks for the "My Bookmarks" rail.
  useEffect(() => {
    if (!isAuthenticated) {
      setBookmarks([]);
      return;
    }
    let cancelled = false;
    setBookmarksLoading(true);
    api.getMyBookmarks(8)
      .then((data) => {
        if (cancelled) return;
        setBookmarks(Array.isArray(data) ? data : []);
      })
      .catch((e) => console.error("Failed to fetch bookmarks:", e))
      .finally(() => { if (!cancelled) setBookmarksLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);


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
      <section className="py-16 lg:py-24 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-12 lg:gap-16">
            <div className="w-full lg:col-span-6">
              <div className="flex items-center justify-center lg:justify-start mb-5">
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                  AI-Powered Technical Publishing
                </span>
              </div>
              <h1 className="text-center text-foreground font-bold text-5xl lg:text-left leading-tight tracking-tight mb-4">
                Transform ideas into{" "}
                <span className="text-muted-foreground font-serif italic">robust tech blogs</span>{" "}
                with AI
              </h1>
              <p className="text-muted-foreground text-base text-center lg:text-left mb-8 leading-relaxed max-w-lg">
                Deploy professional, insightful blogs powered by specialized AI. Scale your knowledge distribution with zero fuss and instant rendering.
              </p>
              <div className="relative my-6">
                <form onSubmit={handleSearchBlogs}>
                  <div className="flex h-11 rounded-md border border-border bg-muted/40 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all overflow-hidden">
                    <input
                      type="text"
                      name="search"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search blogs..."
                      className="flex-1 px-4 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </div>
                </form>

                {searchResults.length > 0 && searchQuery.trim() !== "" && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-72 overflow-y-auto">
                    {searchResults.map((blog) => {
                      const authorIdentifier = blog.author?.email || blog.author_email || blog.authorUsername || blog.author?.username || blog.author?.id || 'unknown';
                      const blogUrl = `/blogs/${encodeURIComponent(authorIdentifier)}/${blog.slug}`;
                      const displayDate = formatDate(getBlogDate(blog), "Date");
                      return (
                        <Link
                          key={blog.slug}
                          href={blogUrl}
                          className="block px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted transition-colors group"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <p className="text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">{blog.title}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{displayDate}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6 mt-8 pt-6 border-t border-border">
                {[
                  { label: "Writers", value: stats.active_users },
                  { label: "Blogs", value: stats.blogs_published },
                  { label: "Total Views", value: stats.total_views },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className="text-xl font-bold text-foreground">{value > 0 ? value.toLocaleString() : '0'}</p>
                    </div>
                    {i < arr.length - 1 && <div className="h-8 w-px bg-border" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:col-span-6 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-xl">
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl shadow-primary/5">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
                    <div className="size-3 rounded-full bg-red-400"></div>
                    <div className="size-3 rounded-full bg-yellow-400"></div>
                    <div className="size-3 rounded-full bg-green-400"></div>
                    <p className="text-xs text-muted-foreground font-mono ml-3">root@blogermenia:~</p>
                  </div>
                  <div className="flex flex-col gap-4 bg-[#0D1117] p-4 h-80 overflow-y-auto">
                    <div ref={messagesRef} className="flex flex-col gap-4 font-mono text-xs">
                      {displayedMessages.map((m, idx) => {
                        let displayText = m.displayedContent;
                        const isTypingThisMessage = idx === currentTypingIndex && m.isTyping;
                        if (isTypingThisMessage) displayText = typingProgress;
                        return (
                          <div key={idx} className={m.align === "right" ? "flex justify-end" : "flex justify-start"}>
                            <div className={m.align === "right" ? "max-w-[90%] text-green-400 py-1" : "max-w-[90%] text-gray-300 py-1"}>
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
      </section>

      {/* Features Section */}
      <section className="py-20 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Engineered for Scale</h2>
            <p className="text-muted-foreground text-base max-w-2xl">
              Transform your thoughts into well-crafted blogs effortlessly. Share knowledge, engage with readers, and build your digital presence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: BookOpen, title: "AI Generation", desc: "Create engaging, well-structured blogs in minutes. Leverage AI to banish writer's block." },
              { icon: Users, title: "Reach Readers", desc: "Share your knowledge with readers worldwide. Build your presence through great content." },
              { icon: TrendingUp, title: "Curated Feeds", desc: "Explore trending tech blogs. Learn, get inspired, and stay updated with fresh perspectives." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-8 flex flex-col hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all">
                <div className="bg-primary/10 text-primary rounded-lg p-3 w-fit mb-6">
                  <Icon className="size-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
                <p className="text-sm text-muted-foreground grow leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* My Bookmarks */}
      {isAuthenticated && (bookmarksLoading || bookmarks.length > 0) && (
        <section className="py-16 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-8">
              <Bookmark className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">My Bookmarks</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-8 -mt-5">Resume reading from where you left off.</p>

            {bookmarksLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-52 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {bookmarks.map((bm) => {
                  const authorKey = bm.author_email || bm.author_username || 'unknown';
                  const href = `/blogs/${encodeURIComponent(authorKey)}/${bm.blog_slug}`;
                  const cover = bm.blog_thumbnail ? getImageUrl(bm.blog_thumbnail) : null;
                  return (
                    <Link key={bm.id} href={href} className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-md transition-all">
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        {cover ? (
                          <Image src={cover} alt={bm.blog_title || 'Bookmarked blog'} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <p className="text-xs">No cover</p>
                          </div>
                        )}
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 bg-primary/90 text-primary-foreground rounded-full text-xs">
                          <Bookmark className="size-3 fill-current" />
                          Saved
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2">{bm.blog_title || 'Untitled'}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          Resume at: <span className="text-primary">{bm.section_title || bm.section_id}</span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Blogs Section */}
      <section className="py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Featured Blogs</h2>
              <p className="text-muted-foreground text-sm mt-1">Hand-picked reads from our editors.</p>
            </div>
            <Link href="/blogs" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
              View All <ArrowRight className="size-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
            </div>
          ) : featuredBlogs.length > 0 ? (
            <div className="space-y-4">
              {featuredBlogs.map((blog) => (
                <HorizontalBlogCard key={blog.slug} blog={blog} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground text-sm">No featured blogs yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Public Playlists Section */}
      <section className="py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Playlists</h2>
              <p className="text-muted-foreground text-sm mt-1">Curated blog series to learn step by step.</p>
            </div>
            <Link href="/playlists" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
              Browse All <ArrowRight className="size-4" />
            </Link>
          </div>

          {playlistsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
            </div>
          ) : playlists.length > 0 ? (
            <div className="space-y-4">
              {playlists.map((playlist) => (
                <Link key={playlist.slug} href={`/playlists/${playlist.owner?.email || playlist.owner?.username}/${playlist.slug}`} className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-2/5 relative min-h-44 bg-muted shrink-0 overflow-hidden">
                      {playlist.cover_image || playlist.thumbnail ? (
                        <Image src={getImageUrl((playlist.cover_image || playlist.thumbnail)?.file_path || (playlist.cover_image || playlist.thumbnail))} alt={playlist.name} fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center p-4 text-muted-foreground text-sm font-medium">{playlist.name}</div>
                      )}
                    </div>
                    <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                      <div>
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium mb-3 inline-block">Playlist</span>
                        <h3 className="text-lg font-semibold text-foreground mb-2">{playlist.name}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed max-w-2xl">
                          {playlist.description || "Explore this carefully curated collection of articles."}
                        </p>
                      </div>
                      <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border">
                        <div className="flex flex-col">
                          <span className="font-semibold text-base text-foreground">{playlist.blog_count || 0}</span>
                          <span className="text-xs text-muted-foreground">Blogs</span>
                        </div>
                        <div className="h-6 w-px bg-border" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-base text-foreground">{(playlist.total_views || 0).toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">Views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground text-sm">No playlists found.</p>
            </div>
          )}
        </div>
      </section>

      {/* Top Authors Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Top Authors</h2>
              <p className="text-muted-foreground text-sm mt-1">The writers behind the best content.</p>
            </div>
            <Link href="/creators" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
              All Authors <ArrowRight className="size-4" />
            </Link>
          </div>

          {authorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
            </div>
          ) : topAuthors.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {topAuthors.map((author) => (
                <Link key={author.email} href={`/blogs/${author.email}`} className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all">
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full sm:w-1/3 shrink-0 bg-muted/40 flex flex-col justify-center items-center p-6">
                      <div className="size-20 rounded-full ring-2 ring-border overflow-hidden relative">
                        {author.profile_image ? (
                          <Image src={getImageUrl(author.profile_image?.file_path || author.profile_image)} alt={author.full_name || author.email} fill sizes="80px" className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary rounded-full">
                            <span className="font-bold text-2xl">{author.full_name?.[0] || author.email?.[0] || 'U'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center p-5">
                      <div className="mb-3 border-b border-border pb-3">
                        <h3 className="font-semibold text-lg text-foreground truncate">{author.full_name || author.email?.split('@')[0] || "User"}</h3>
                        <p className="text-xs text-muted-foreground truncate mb-1">{author.email}</p>
                        {author.headline && <p className="text-xs text-muted-foreground line-clamp-1 italic">{author.headline}</p>}
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-base text-foreground">{author.blog_count || 0}</span>
                          <span className="text-xs text-muted-foreground">Blogs</span>
                        </div>
                        <div className="h-6 w-px bg-border" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-base text-foreground">{(author.total_views || 0).toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">Views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground text-sm">No authors found.</p>
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
