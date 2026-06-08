"use client";

import Image from "next/image";
import { getImageUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared profile header — avatar + name + stats grid.
 * Used by both UserBlogsList and my-blogs page.
 *
 * Props:
 *   profile  — object  { full_name, email, username, headline, bio, description,
 *                        profile_image, blog_count, total_views, total_likes, created_at }
 *   loading  — boolean (optional) — shows skeleton if true
 *   actions  — ReactNode (optional) — action buttons rendered in the right column
 *   categories — string[] (optional) — category tags shown under stats
 */
export default function ProfileHeader({ profile, loading = false, actions = null, categories = [] }) {
  if (loading) {
    return (
      <div className="mb-12 border-2 border-foreground p-8 bg-background shadow-[8px_8px_0px_0px_rgba(88,28,135,1)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Skeleton className="w-28 h-28 rounded-none shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48 rounded-none" />
              <Skeleton className="h-4 w-32 rounded-none" />
              <Skeleton className="h-4 w-64 rounded-none" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-16 w-full rounded-none" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const avatarSrc = typeof profile.profile_image === "string"
    ? profile.profile_image
    : profile.profile_image?.file_path;

  const joinedDate = (profile.created_at || profile.createdAt)
    ? new Date(profile.created_at || profile.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";

  const displayCategories = (categories || []).filter((c) => c.toLowerCase() !== "all");

  return (
    <div className="mb-12 border-2 border-foreground p-8 bg-background shadow-[8px_8px_0px_0px_rgba(88,28,135,1)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── Left: Avatar + Name ── */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <div className="absolute inset-0 border-2 border-foreground bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(13,17,23,1)] overflow-hidden">
              {avatarSrc ? (
                <Image
                  src={getImageUrl(avatarSrc)}
                  alt={profile.username || profile.full_name || "User"}
                  fill
                  sizes="112px"
                  className="object-cover transition-all duration-500"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-foreground text-background">
                  <span className="font-mono font-bold uppercase tracking-widest text-3xl">
                    {profile.full_name?.[0] || profile.email?.[0] || "U"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center text-center sm:text-left mt-2">
            <h1 className="font-extrabold text-3xl text-foreground mb-1 uppercase tracking-tighter">
              {profile.full_name || profile.email?.split("@")[0] || "User"}
            </h1>
            <p className="font-mono font-bold text-xs uppercase tracking-widest text-purple-900 mb-3 border-b-2 border-foreground inline-block pb-1">
              {profile.email}
            </p>
            {profile.headline && (
              <p className="font-serif italic text-lg text-foreground mb-2">
                {profile.headline}
              </p>
            )}
            {(profile.bio || profile.description) && (
              <p className="font-mono text-xs leading-relaxed text-gray-600 line-clamp-3">
                {profile.bio || profile.description}
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Stats + Actions + Categories ── */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Stats Row */}
          <div className="flex flex-row items-center justify-between sm:justify-start sm:gap-12 border-b-2 border-foreground pb-6">
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-extrabold text-3xl text-foreground leading-none">
                {profile.blog_count || 0}
              </span>
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                Blogs
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-extrabold text-3xl text-foreground leading-none">
                {(profile.total_views || 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                Views
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-extrabold text-3xl text-foreground leading-none">
                {(profile.total_likes || 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                Likes
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-bold font-mono text-lg text-foreground leading-none mt-1">
                {joinedDate}
              </span>
              <span className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mt-2">
                Joined
              </span>
            </div>
          </div>

          {/* Action Buttons (owner-only controls) */}
          {actions && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
              {actions}
            </div>
          )}

          {/* Category tags (read-only, shown in public view) */}
          {displayCategories.length > 0 && !actions && (
            <div className="flex flex-wrap gap-2">
              {displayCategories.map((category, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-[11px] font-mono font-bold text-foreground bg-background border-2 border-foreground uppercase tracking-widest"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
