'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Image from 'next/image';
import BlogCard from '@/components/BlogCard';
import { getImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      if (data && Array.isArray(data.blogs) && data.blogs.length > 0) {
        const firstBlog = data.blogs[0];
        const needsHydration = typeof firstBlog === 'string' || !firstBlog.created_at || typeof firstBlog.category === 'string';
        if (needsHydration) {
          const blogPromises = data.blogs.map(blog => {
            const identifier = typeof blog === 'string' ? blog : blog.slug;
            return api.getBlogBySlug(identifier, authToken, false);
          });
          const results = await Promise.allSettled(blogPromises);
          data.blogs = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
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

  useEffect(() => { fetchPlaylist(); }, [fetchPlaylist]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-muted rounded-md px-6 py-3 text-muted-foreground text-sm flex items-center gap-3">
          <span className="size-4 border-2 border-border border-t-primary rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen py-16 px-4">
        <div className="max-w-lg mx-auto text-center bg-card border border-border rounded-xl p-12 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground mb-4">Playlist not found</h1>
          <Button asChild variant="outline" size="sm">
            <Link href={`/blogs/${username}`}><ArrowLeft className="size-4" />Back</Link>
          </Button>
        </div>
      </div>
    );
  }

  const coverSrc = getImageUrl(
    typeof (playlist.cover_image || playlist.thumbnail) === 'string'
      ? (playlist.cover_image || playlist.thumbnail)
      : (playlist.cover_image?.file_path || playlist.thumbnail?.file_path || null)
  );
  const totalPages = Math.ceil((playlist.blogs?.length || 0) / BLOGS_PER_PAGE);

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => { if (typeof window !== 'undefined' && window.history.length > 1) router.back(); else router.push(`/blogs/${username}`); }}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to {playlist?.owner?.full_name || username}
        </button>

        {/* Playlist Header */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Cover Image */}
            <div className="lg:col-span-4 relative min-h-56 bg-muted">
              {coverSrc ? (
                <Image src={coverSrc} alt={playlist.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground min-h-56">
                  <BookOpen className="size-12 opacity-30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="lg:col-span-8 p-7 md:p-9 flex flex-col justify-between">
              <div>
                <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium mb-3 inline-block">Playlist</span>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">{playlist.name}</h1>
                <p className="text-sm text-primary hover:underline underline-offset-2 mb-4">
                  <Link href={`/blogs/${playlist.owner?.email || username}`}>
                    by {playlist.owner?.full_name || playlist.owner?.email || username}
                  </Link>
                </p>
                {playlist.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{playlist.description}</p>
                )}
              </div>

              <div className="flex items-center gap-8 mt-7 pt-5 border-t border-border">
                {[
                  { value: playlist.blog_count || 0, label: "Blogs" },
                  { value: (playlist.total_views || 0).toLocaleString(), label: "Views" },
                  { value: (playlist.total_likes || 0).toLocaleString(), label: "Likes" },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground leading-none">{value}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1.5">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Blogs Grid */}
        {playlist.blogs && playlist.blogs.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-5">
              {playlist.blogs.length} blog{playlist.blogs.length !== 1 ? 's' : ''}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlist.blogs
                .slice((currentPage - 1) * BLOGS_PER_PAGE, currentPage * BLOGS_PER_PAGE)
                .map((blog, idx) => {
                  const globalIndex = (currentPage - 1) * BLOGS_PER_PAGE + idx;
                  return (
                    <div key={blog._id || blog.id || blog.slug || idx} className="relative">
                      <span className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground text-xs font-medium rounded-full size-6 flex items-center justify-center shadow-sm">
                        {globalIndex + 1}
                      </span>
                      <BlogCard blog={blog} />
                    </div>
                  );
                })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => { setCurrentPage(p => Math.max(p - 1, 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />Prev
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrentPage(i + 1); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                      className={cn(
                        "size-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                        currentPage === i + 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setCurrentPage(p => Math.min(p + 1, totalPages)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next<ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed border-border">
            <BookOpen className="size-12 mx-auto text-muted-foreground mb-4 opacity-40" />
            <p className="text-lg font-semibold text-foreground mb-2">No blogs yet</p>
            <p className="text-muted-foreground text-sm mb-6">No blogs have been added to this playlist.</p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/blogs/${username}`}>Browse Blogs</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
