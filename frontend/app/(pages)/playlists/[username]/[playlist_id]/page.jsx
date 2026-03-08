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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Playlist Not Found
          </h1>
          <Link
            href={`/blogs/${username}`}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {username}'s Articles
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
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {playlist?.owner?.full_name || username}'s Articles
        </Link>

        {/* Playlist Profile Section */}
        <div className="relative mb-12 border border-gray-200 rounded-2xl p-8 bg-white shadow-sm overflow-hidden min-h-[16rem]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Column: Cover Image */}
            <div className="lg:col-span-5 relative">
              <div className="relative w-full h-full min-h-[12rem] rounded-xl overflow-hidden bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 shadow-inner">
                {(typeof (playlist.cover_image || playlist.thumbnail) === 'string' ? (playlist.cover_image || playlist.thumbnail) : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path)) ? (
                  <Image
                    src={getImageUrl(typeof (playlist.cover_image || playlist.thumbnail) === 'string' ? (playlist.cover_image || playlist.thumbnail) : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path))}
                    alt={playlist.name}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-20" />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Name, Description & Stats Cluster */}
            <div className="lg:col-span-7 flex flex-col justify-between py-1">
              <div>
                <h3 className="font-bold text-3xl text-gray-900 mb-2">
                  {playlist.name}
                </h3>
                <p className="font-medium text-base text-indigo-600 mb-6 transition-colors hover:text-indigo-700">
                  <Link href={`/blogs/${playlist.owner?.email || username}`}>
                    Playlist by {playlist.owner?.full_name || playlist.owner?.email || username}
                  </Link>
                </p>
                {playlist.description && (
                  <p className="font-normal text-sm leading-relaxed text-gray-500 line-clamp-3">
                    {playlist.description}
                  </p>
                )}
              </div>

              {/* Minimalism Stats Cluster */}
              <div className="flex flex-row items-center gap-10 mt-8 pt-6 border-t border-gray-100">
                <div className="flex flex-col">
                  <span className="font-bold text-2xl text-gray-900 leading-none">
                    {playlist.blog_count || 0}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Blogs
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-2xl text-gray-900 leading-none">
                    {(playlist.total_views || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Views
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-2xl text-gray-900 leading-none">
                    {(playlist.total_likes || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Blogs in this Playlist ({playlist.blogs.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
              {playlist.blogs
                .slice((currentPage - 1) * BLOGS_PER_PAGE, currentPage * BLOGS_PER_PAGE)
                .map((blog, idx) => {
                  const globalIndex = (currentPage - 1) * BLOGS_PER_PAGE + idx;
                  return (
                    <div key={blog.id} className="relative group">
                      <div className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full font-bold text-sm shadow-lg">
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
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  {[...Array(Math.ceil(playlist.blogs.length / BLOGS_PER_PAGE))].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i + 1);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className={`w-10 h-10 rounded-lg font-bold transition-all ${currentPage === i + 1
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-500'
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
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all font-bold flex items-center gap-2 shadow-sm"
                >
                  <span className="text-sm">Next</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No blogs yet
            </h3>
            <p className="text-gray-600 mb-6">
              There are no blogs in this playlist.
            </p>
            <Link
              href={`/blogs/${username}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 font-bold"
            >
              Go to Articles
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
