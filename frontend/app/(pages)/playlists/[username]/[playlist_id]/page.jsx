'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, BookOpen, Loader2, Eye, Heart, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Image from 'next/image';
import BlogCard from '@/components/BlogCard';
import { getImageUrl } from '@/lib/utils';

export default function PlaylistDetailPage() {
  const params = useParams();
  const { token: authToken } = useAuth();
  const playlistSlug = params.playlist_id;
  const username = params.username;

  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const BLOGS_PER_PAGE = 6;

  const fetchPlaylist = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getPlaylist(playlistSlug, authToken);

      // Hydrate blogs if they are just strings (IDs) or partially populated objects
      if (data && Array.isArray(data.blogs) && data.blogs.length > 0) {
        const firstBlog = data.blogs[0];
        const needsHydration = typeof firstBlog === 'string' || !firstBlog.created_at || typeof firstBlog.category === 'string';

        if (needsHydration) {
          const blogPromises = data.blogs.map(blog => {
            const identifier = typeof blog === 'string' ? blog : blog.slug;
            return api.getBlogBySlug(identifier, authToken, false);
          });
          const results = await Promise.allSettled(blogPromises);
          data.blogs = results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);
        }
      }

      setPlaylist(data);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast.error('Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  }, [playlistSlug, authToken]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-background">
        <div className="flex items-center justify-center gap-3 bg-background px-6 py-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(13,17,23,1)]">
            <span className="h-5 w-5 border-2 border-foreground border-r-transparent animate-spin"></span>
            <span className="font-mono font-bold text-sm uppercase tracking-widest text-foreground">Loading Collection...</span>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center border-2 border-foreground p-12 shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
          <h1 className="text-3xl font-extrabold text-foreground mb-6 uppercase tracking-tight">
            SYSTEM.404_PLAYLIST
          </h1>
          <Link
            href={`/blogs/${username}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-mono font-bold uppercase tracking-widest text-xs hover:bg-purple-900 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href={`/blogs/${username}`}
          className="inline-flex items-center gap-2 text-foreground hover:bg-foreground hover:text-background border-2 border-transparent hover:border-foreground px-3 py-1 font-mono font-bold uppercase tracking-widest text-xs transition-all mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {playlist?.owner?.full_name || username}'s Articles
        </Link>

        {/* Playlist Profile Section */}
        <div className="relative mb-12 border-2 border-foreground p-8 bg-background shadow-[8px_8px_0px_0px_#581c87] min-h-[16rem]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Column: Cover Image */}
            <div className="lg:col-span-5 relative">
              <div className="relative w-full h-full min-h-[12rem] border-2 border-foreground bg-purple-900 overflow-hidden">
                {(typeof (playlist.cover_image || playlist.thumbnail) === 'string' ? (playlist.cover_image || playlist.thumbnail) : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path)) ? (
                  <Image
                    src={getImageUrl(typeof (playlist.cover_image || playlist.thumbnail) === 'string' ? (playlist.cover_image || playlist.thumbnail) : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path))}
                    alt={playlist.name}
                    fill
                    className="object-cover grayscale hover:grayscale-0 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-foreground text-background">
                    <p className="font-mono font-bold uppercase tracking-widest text-6xl opacity-50">SYS.NO_IMG</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Name, Description & Stats Cluster */}
            <div className="lg:col-span-7 flex flex-col justify-between py-1">
              <div>
                <h3 className="font-extrabold text-4xl text-foreground mb-2 uppercase tracking-tighter">
                  {playlist.name}
                </h3>
                <p className="font-mono font-bold text-xs uppercase tracking-widest text-purple-900 border-b-2 border-foreground inline-block pb-1 mb-6 hover:text-foreground transition-colors">
                  <Link href={`/blogs/${playlist.owner?.email || username}`}>
                    Playlist by {playlist.owner?.full_name || playlist.owner?.email || username}
                  </Link>
                </p>
                {playlist.description && (
                  <p className="font-mono text-sm leading-relaxed text-gray-700 line-clamp-3">
                    {playlist.description}
                  </p>
                )}
              </div>

              {/* Minimalism Stats Cluster */}
              <div className="flex flex-row items-center gap-10 mt-8 pt-6 border-t-2 border-foreground">
                <div className="flex flex-col">
                  <span className="font-extrabold text-3xl text-foreground leading-none">
                    {playlist.blog_count || 0}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                    Blogs
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-3xl text-foreground leading-none">
                    {(playlist.total_views || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                    Views
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-3xl text-foreground leading-none">
                    {(playlist.total_likes || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                    Likes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Blogs Grid */}
        {playlist.blogs && playlist.blogs.length > 0 ? (
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-6 uppercase tracking-tight">
              SYSTEM.RECORDS [{playlist.blogs.length}]
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
              {playlist.blogs
                .slice((currentPage - 1) * BLOGS_PER_PAGE, currentPage * BLOGS_PER_PAGE)
                .map((blog, idx) => {
                  const globalIndex = (currentPage - 1) * BLOGS_PER_PAGE + idx;
                  return (
                    <div key={blog.id} className="relative group">
                      <div className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-foreground text-background border-2 border-background rounded-full font-mono font-bold text-sm">
                        {globalIndex + 1}
                      </div>
                      <div className="relative">
                        <BlogCard blog={blog} />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pagination Controls */}
            {playlist.blogs.length > BLOGS_PER_PAGE && (
              <div className="flex items-center justify-center gap-3 mt-12">
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground text-foreground font-mono font-bold uppercase tracking-widest text-[10px] hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  {[...Array(Math.ceil(playlist.blogs.length / BLOGS_PER_PAGE))].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i + 1);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className={`w-9 h-9 border-2 border-foreground font-mono font-bold text-xs transition-all ${currentPage === i + 1
                        ? "bg-foreground text-background shadow-[2px_2px_0px_0px_rgba(13,17,23,1)]"
                        : "bg-background text-foreground hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, Math.ceil(playlist.blogs.length / BLOGS_PER_PAGE)));
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  disabled={currentPage === Math.ceil(playlist.blogs.length / BLOGS_PER_PAGE)}
                  className="flex items-center gap-1 px-3 py-2 bg-background border-2 border-foreground text-foreground font-mono font-bold uppercase tracking-widest text-[10px] hover:bg-purple-900 hover:text-white shadow-[2px_2px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span className="text-sm">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-background border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(13,17,23,1)]">
            <BookOpen className="w-16 h-16 mx-auto text-foreground mb-4 opacity-50" />
            <h3 className="text-2xl font-extrabold text-foreground mb-2 uppercase tracking-tight">
              SYSTEM.EMPTY
            </h3>
            <p className="text-gray-600 mb-6 font-mono text-sm">
              No records found in this collection.
            </p>
            <Link
              href={`/blogs/${username}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-mono font-bold uppercase tracking-widest text-xs hover:bg-purple-900 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Go to Articles
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
