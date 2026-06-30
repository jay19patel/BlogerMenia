"use client";

import Image from "next/image";
import { getImageUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileHeader({ profile, loading = false, actions = null, categories = [] }) {
  if (loading) {
    return (
      <div className="mb-12 bg-card border border-border rounded-xl p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Skeleton className="size-28 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-16 w-full" />
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
    <div className="mb-12 bg-card border border-border rounded-xl p-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Avatar + Name */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative size-28 shrink-0">
            <div className="absolute inset-0 rounded-full ring-2 ring-primary/20 overflow-hidden">
              {avatarSrc ? (
                <Image
                  src={getImageUrl(avatarSrc)}
                  alt={profile.username || profile.full_name || "User"}
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary rounded-full">
                  <span className="font-bold text-3xl">
                    {profile.full_name?.[0] || profile.email?.[0] || "U"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center text-center sm:text-left mt-2">
            <h1 className="font-bold text-2xl text-foreground mb-1">
              {profile.full_name || profile.email?.split("@")[0] || "User"}
            </h1>
            <p className="text-primary text-sm mb-2">
              {profile.email}
            </p>
            {profile.headline && (
              <p className="italic text-base text-muted-foreground mb-2">
                {profile.headline}
              </p>
            )}
            {(profile.bio || profile.description) && (
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {profile.bio || profile.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats + Actions + Categories */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-row items-center justify-between sm:justify-start sm:gap-12 border-b border-border pb-6">
            {[
              { value: profile.blog_count || 0, label: "Blogs" },
              { value: (profile.total_views || 0).toLocaleString(), label: "Views" },
              { value: (profile.total_likes || 0).toLocaleString(), label: "Likes" },
              { value: joinedDate, label: "Joined" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center sm:items-start">
                <span className="font-bold text-2xl text-foreground leading-none">
                  {value}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1.5">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {actions && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {actions}
            </div>
          )}

          {displayCategories.length > 0 && !actions && (
            <div className="flex flex-wrap gap-2">
              {displayCategories.map((category, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-xs font-medium text-secondary-foreground bg-secondary rounded-full"
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
