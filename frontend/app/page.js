"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Users, TrendingUp, Eye, Heart } from "lucide-react";
import BlogCard from "@/components/BlogCard";
import HorizontalBlogCard from "@/components/HorizontalBlogCard";
import Testimonial from "@/components/Testimonial";
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
        if (data) setStats(data);
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
      <section className="pt-0 lg:pt-8 lg:px-8 h-full overflow-visible">
        <div className="rounded-2xl bg-indigo-50 py-10 overflow-visible m-5 lg:m-0 2xl:py-16 xl:py-8 lg:rounded-tl-2xl lg:rounded-bl-2xl relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 overflow-visible">
            <div className="grid grid-cols-1 gap-14 items-center lg:grid-cols-12 lg:gap-32 overflow-visible">
              <div className="w-full xl:col-span-5 lg:col-span-6 2xl:-mx-5 xl:-mx-0 overflow-visible">
                <div className="flex items-center text-sm font-medium text-gray-500 justify-center lg:justify-start">
                  <span className="bg-indigo-600 py-1 px-3 rounded-2xl text-xs font-medium text-white mr-3">
                    #1
                  </span>
                  AI-Powered Blog Platform
                </div>
                <h1 className="py-8 text-center text-gray-900 font-bold text-5xl lg:text-left leading-[70px]">
                  Transform ideas into{" "}
                  <span className="text-indigo-600">engaging blogs</span> with AI
                </h1>
                <p className="text-gray-500 text-lg text-center lg:text-left">
                  Create professional, insightful blogs powered by AI. Share your knowledge and discover meaningful content from a vibrant community of writers and readers.
                </p>
                <div className="relative my-10">
                  <form onSubmit={handleSearchBlogs}>
                    <div className="relative p-1.5 flex items-center gap-y-4 h-auto md:h-16 flex-col md:flex-row justify-between rounded-full md:shadow-[0px_15px_30px_-4px_rgba(16,24,40,0.03)] border border-transparent md:bg-white transition-all duration-500 hover:border-indigo-600 focus-within:border-indigo-600">
                      <input
                        type="text"
                        name="search"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Type anything you want to know..."
                        className="text-base rounded-full text-gray-900 flex-1 py-4 px-6 shadow-[0px_15px_30px_-4px_rgba(16,24,40,0.03)] md:shadow-none bg-white md:bg-transparent placeholder:text-gray-400 focus:outline-none md:w-fit w-full"
                      />
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="bg-indigo-600 rounded-full py-3 px-7 text-base font-semibold text-white hover:bg-indigo-700 cursor-pointer transition-all duration-500 md:w-fit w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSearching ? "Searching..." : "Find Blogs"}
                      </button>
                    </div>
                  </form>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && searchQuery.trim() !== "" && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto overflow-x-hidden py-2">
                      {searchResults.map((blog) => {
                        const authorIdentifier = blog.author?.email || blog.author_email || blog.authorUsername;
                        const blogUrl = authorIdentifier ? `/blogs/${encodeURIComponent(authorIdentifier)}/${blog.slug}` : `/blogs/${blog.slug}`;
                        const displayDate = formatDate(blog.publishedDate || blog.created_at);

                        return (
                          <Link
                            key={blog.slug}
                            href={blogUrl}
                            className="block px-5 py-3 border-b border-gray-50 last:border-b-0 hover:bg-indigo-50 transition-colors group"
                          >
                            <div className="flex justify-between items-start gap-4">
                              <p className="text-gray-900 font-semibold text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{blog.title}</p>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap mt-1">{displayDate}</span>
                            </div>
                            {blog.excerpt && (
                              <p className="text-gray-500 text-xs mt-1 line-clamp-1 italic">
                                {blog.excerpt}...
                              </p>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-6 mt-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-100 rounded-lg">
                      <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Active Users</p>
                      <p className="text-lg font-bold text-gray-900">{stats.active_users > 0 ? stats.active_users.toLocaleString() : '0'}</p>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-gray-300"></div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-purple-100 rounded-lg">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Blogs Published</p>
                      <p className="text-lg font-bold text-gray-900">{stats.blogs_published > 0 ? stats.blogs_published.toLocaleString() : '0'}</p>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-gray-300"></div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-green-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Total Views</p>
                      <p className="text-lg font-bold text-gray-900">{stats.total_views > 0 ? stats.total_views.toLocaleString() : '0'}</p>
                    </div>
                  </div>
                </div>
              </div>



              <div className="w-full lg:col-span-6 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-2xl">
                  {/* Floating elements */}
                  <div className="absolute -top-6 -left-6 w-20 h-20 bg-indigo-400/20 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>

                  {/* Main Card */}
                  <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-1 shadow-2xl">
                    <div className="bg-white rounded-3xl p-8 shadow-inner">
                      {/* Browser Header */}
                      <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-200">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 shadow-sm"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-sm"></div>
                        <div className="flex-1 ml-4 bg-gray-100 rounded-lg px-4 py-1.5">
                          <p className="text-xs text-gray-400">blogermenia.com/blog-create-chat</p>
                        </div>
                      </div>

                      {/* Chat-like generator */}
                      <div className="flex flex-col gap-4">
                        {/* Messages */}
                        <div ref={messagesRef} className="bg-gray-50 rounded-xl p-4 border-2 border-indigo-100 h-[280px] overflow-y-auto flex flex-col gap-3">
                          {displayedMessages.map((m, idx) => {
                            // Determine what to display
                            let displayText = m.displayedContent;
                            const isTypingThisMessage = idx === currentTypingIndex && m.isTyping;
                            if (isTypingThisMessage) {
                              displayText = typingProgress;
                            }

                            return (
                              <div key={idx} className={m.align === "right" ? "flex justify-end" : "flex justify-start"}>
                                <div className={
                                  m.align === "right"
                                    ? "max-w-[85%] bg-indigo-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm"
                                    : "max-w-[85%] bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm"
                                }>
                                  {m.pending ? (
                                    <span className="inline-flex items-center gap-1">
                                      Creating
                                      <span className="inline-flex gap-1">
                                        <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                                        <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
                                        <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                      </span>
                                    </span>
                                  ) : (
                                    <div className="prose prose-sm max-w-none">
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                          code({ node, inline, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || "");
                                            const language = match ? match[1] : "";
                                            return !inline && match ? (
                                              <SyntaxHighlighter
                                                style={oneDark}
                                                language={language}
                                                PreTag="div"
                                                className="rounded-lg text-xs"
                                                {...props}
                                              >
                                                {String(children).replace(/\n$/, "")}
                                              </SyntaxHighlighter>
                                            ) : (
                                              <code className={className} {...props}>
                                                {children}
                                              </code>
                                            );
                                          },
                                        }}
                                      >
                                        {displayText}
                                      </ReactMarkdown>
                                      {isTypingThisMessage && displayText.length < m.content.length && (
                                        <span className="inline-block w-0.5 h-4 bg-current ml-1 animate-pulse"></span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* No input — pure simulation */}
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
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="text-4xl text-center font-bold text-gray-900 leading-[3.25rem] mb-6 max-w-max lg:max-w-3xl lg:mx-auto">
              Built for creators, powered by AI intelligence
            </h2>
            <p className="text-base font-normal text-gray-500 lg:max-w-2xl lg:mx-auto mb-8">
              Transform your thoughts into well-crafted blogs effortlessly. Share knowledge, engage with readers, and build your digital presence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-lg mx-auto md:max-w-2xl lg:max-w-full">
            <div className="relative w-full md:col-span-2 flex">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex justify-between flex-row flex-wrap flex-1">
                <div className="p-5 xl:p-8 w-full md:w-1/2 flex flex-col">
                  <div className="block">
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 30 30"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15 12.5V18.75M18.75 2.5L11.25 2.5M15 28.75C8.7868 28.75 3.75 23.7132 3.75 17.5C3.75 11.2868 8.7868 6.25 15 6.25C21.2132 6.25 26.25 11.2868 26.25 17.5C26.25 23.7132 21.2132 28.75 15 28.75Z"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold xl:text-2xl text-white py-5 w-full xl:w-64">
                    Generate blogs instantly with AI assistance.
                  </h3>
                  <p className="text-sm font-normal text-gray-300 w-full mb-8 xl:w-64 flex-grow">
                    Create engaging, well-structured blogs in minutes. No more staring at blank pages or struggling with writer&#39;s block.
                  </p>
                </div>
                <div className="relative hidden md:w-1/2 md:flex overflow-hidden">
                  <div className="w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                    <svg
                      width="100"
                      height="100"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 2L2 7L12 12L22 7L12 2Z"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 17L12 22L22 17"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 12L12 17L22 12"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative w-full flex">
              <div className="bg-indigo-500 rounded-2xl p-5 xl:p-8 w-full flex flex-col">
                <div className="block">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 30 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M24.6429 11.4286C24.6429 14.3872 20.2457 16.7857 14.8214 16.7857C9.3972 16.7857 5 14.3872 5 11.4286M24.6429 16.7857C24.6429 19.7444 20.2457 22.1429 14.8214 22.1429C9.3972 22.1429 5 19.7444 5 16.7857M24.6429 22.1429C24.6429 25.1015 20.2457 27.5 14.8214 27.5C9.3972 27.5 5 25.1015 5 22.1429M24.6429 6.96429C24.6429 9.42984 20.2457 11.4286 14.8214 11.4286C9.3972 11.4286 5 9.42984 5 6.96429C5 4.49873 9.3972 2.5 14.8214 2.5C20.2457 2.5 24.6429 4.49873 24.6429 6.96429Z"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h3 className="py-5 text-white text-xl font-bold xl:text-2xl">
                  Share knowledge with your audience
                </h3>
                <p className="text-sm font-normal text-white mb-8 flex-grow">
                  Reach and engage with readers worldwide. Build your thought leadership through quality content sharing.
                </p>
              </div>
            </div>
            <div className="relative w-full flex">
              <div className="bg-violet-500 rounded-2xl p-5 xl:p-8 w-full flex flex-col">
                <div className="block">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 30 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M26.7301 15.661C26.7301 22.1995 21.306 27.5 14.6151 27.5C7.9241 27.5 2.5 22.1995 2.5 15.661C2.5 9.1225 7.9241 3.822 14.6151 3.822M18.1313 10.1507L18.1313 4.85383C18.1313 3.22503 19.6455 2.00299 21.1519 2.70013C23.7608 3.90751 26.6177 6.25557 27.456 10.2563C27.7542 11.6798 26.4931 12.8563 25.0064 12.8368L20.7873 12.7814C19.3147 12.762 18.1313 11.5899 18.1313 10.1507Z"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h3 className="py-5 text-white text-xl font-bold xl:text-2xl">
                  Discover inspiring content daily
                </h3>
                <p className="text-sm font-normal text-white mb-8 flex-grow">
                  Explore trending blogs from creative minds. Learn, get inspired, and stay updated with fresh perspectives across diverse topics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Blogs Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Top Viewed Blogs</h2>
              <p className="text-gray-500 text-sm mt-1">Our most popular stories and insights from the community.</p>
            </div>
            <Link href="/blogs" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group">
              View All Blogs <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-6 bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                  <div className="md:w-1/3 h-48 md:h-40 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-4 py-2">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredBlogs.length > 0 ? (
            <div className="space-y-4">
              {featuredBlogs.map((blog) => (
                <HorizontalBlogCard key={blog.slug} blog={blog} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No popular blogs available at the moment.</p>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              View All Blogs
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Public Playlists Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Popular Playlists</h2>
              <p className="text-gray-500 text-sm mt-1">Curated collections of great reads and learning paths.</p>
            </div>
            <Link href="/playlists" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group">
              View All Playlists <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {playlistsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : playlists.length > 0 ? (
            <div className="space-y-4">
              {playlists.map((playlist) => (
                <Link key={playlist.slug} href={`/playlists/${playlist.owner?.email || playlist.owner?.username}/${playlist.slug}`} className="group block bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-500 border border-gray-200 hover:border-indigo-500 shadow-sm relative md:h-40">
                  <div className="flex flex-col md:flex-row h-full">
                    {/* Full view image container */}
                    <div className="md:w-1/4 relative overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                      {playlist.thumbnail ? (
                        <Image
                          src={getImageUrl(playlist.thumbnail?.file_path || playlist.thumbnail)}
                          alt={playlist.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 25vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4 text-center text-white font-bold text-sm rounded-lg opacity-90">
                          {playlist.name}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <h3 className="text-base md:text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1 line-clamp-1">
                        {playlist.name}
                      </h3>
                      <p className="text-gray-600 text-[11px] md:text-xs line-clamp-2 mb-4 leading-relaxed max-w-2xl opacity-80">
                        {playlist.description || "Explore this carefully curated collection of articles focused on specific topics."}
                      </p>
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-gray-900 leading-none">{playlist.blog_count || 0}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Articles</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-gray-900 leading-none">{(playlist.total_views || 0).toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Views</span>
                        </div>
                        <div className="flex flex-col border-l border-gray-100 pl-8 hidden sm:flex">
                          <span className="text-base font-bold text-gray-900 leading-none">{(playlist.total_likes || 0).toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No playlists found.</p>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/playlists"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              View All Playlists
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Top Authors Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Top Creators</h2>
              <p className="text-gray-500 text-sm mt-1">Meet the minds behind the most popular content.</p>
            </div>
            <Link href="/creators" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group">
              View All Creators <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {authorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : topAuthors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topAuthors.map((author) => (
                <Link
                  key={author.email}
                  href={`/blogs/${author.email}`}
                  className="group block bg-white border border-gray-200 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-indigo-500 transition-all duration-500 shadow-sm md:h-44"
                >
                  <div className="flex flex-col md:flex-row h-full p-6 gap-6">
                    {/* Left Side: Circular Avatar */}
                    <div className="relative w-24 h-24 shrink-0 mx-auto md:mx-0">
                      <div className="absolute inset-0 border-4 border-indigo-50 rounded-full overflow-hidden shadow-inner group-hover:border-indigo-100 transition-colors">
                        <Image
                          src={author.profile_image ? getImageUrl(author.profile_image?.file_path || author.profile_image) : `https://ui-avatars.com/api/?name=${author.full_name || author.email}&background=random`}
                          alt={author.full_name || author.email}
                          fill
                          sizes="96px"
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          unoptimized
                        />
                      </div>
                    </div>

                    {/* Right Side: Content */}
                    <div className="flex-1 flex flex-col justify-center min-w-0 text-center md:text-left">
                      <div className="mb-3">
                        <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                          {author.full_name || author.email?.split('@')[0] || "User"}
                        </h3>
                        <p className="font-semibold text-[11px] text-indigo-600 truncate opacity-90 mb-1">
                          {author.email}
                        </p>
                        {author.headline && (
                          <p className="text-xs text-gray-500 line-clamp-1 italic">
                            {author.headline}
                          </p>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="flex flex-row items-center justify-center md:justify-start gap-8 pt-3 border-t border-gray-50">
                        <div className="flex flex-col items-center md:items-start">
                          <span className="font-bold text-lg text-gray-900 leading-none">
                            {author.blog_count || 0}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Blogs
                          </span>
                        </div>
                        <div className="flex flex-col items-center md:items-start border-l border-gray-100 pl-8">
                          <span className="font-bold text-lg text-gray-900 leading-none">
                            {(author.total_views || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Views
                          </span>
                        </div>
                        <div className="flex flex-col items-center md:items-start border-l border-gray-100 pl-8">
                          <span className="font-bold text-lg text-gray-900 leading-none">
                            {(author.total_likes || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Likes
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No authors found.</p>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/creators"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              View All Creators
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <Testimonial />

      {/* FAQ Section */}
      <FAQ />
    </>
  );
}
