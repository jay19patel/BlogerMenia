"use client";

import { useState, type ReactNode } from "react";

import { useSession } from "@/components/session-provider";
import { cn } from "@/lib/cn";

/**
 * The tab strip and panels of `blog/profile.html`.
 *
 * Panels are rendered on the server and handed in as props; this component only
 * owns which one is visible, plus the two tabs the original shows conditionally
 * (Saved Blogs on your own profile, About when the bio is filled in).
 */

type TabKey = "blogs" | "playlists" | "saved" | "about";

const ACTIVE_BUTTON = "text-brand-700 border-brand-600 font-semibold";
const IDLE_BUTTON = "text-slate-500 font-medium border-transparent hover:text-slate-800";

export function ProfileTabs({
  profileUsername,
  blogsPanel,
  playlistsPanel,
  savedPanel,
  aboutPanel,
}: {
  profileUsername: string;
  blogsPanel: ReactNode;
  playlistsPanel: ReactNode;
  savedPanel: ReactNode;
  aboutPanel: ReactNode | null;
}) {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("blogs");

  const isOwnProfile = user?.username === profileUsername;
  const visibleTab = activeTab === "saved" && !isOwnProfile ? "blogs" : activeTab;

  const tabs: { key: TabKey; label: string; shown: boolean }[] = [
    { key: "blogs", label: "Blogs", shown: true },
    { key: "playlists", label: "Playlists", shown: true },
    { key: "saved", label: "Saved Blogs", shown: isOwnProfile },
    { key: "about", label: "About", shown: aboutPanel !== null },
  ];

  return (
    <>
      <div className="flex items-center gap-0 pt-6 mb-8 border-b border-slate-100">
        {tabs
          .filter((tab) => tab.shown)
          .map((tab, index, shownTabs) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "tab-btn px-1 pb-3 text-sm border-b-2 transition-colors",
                index !== shownTabs.length - 1 && "mr-7",
                visibleTab === tab.key ? ACTIVE_BUTTON : IDLE_BUTTON,
              )}
            >
              {tab.label}
            </button>
          ))}
      </div>

      <div className={cn("pb-12", visibleTab !== "blogs" && "hidden")}>{blogsPanel}</div>
      <div className={cn("pb-12", visibleTab !== "playlists" && "hidden")}>{playlistsPanel}</div>
      {aboutPanel !== null && (
        <div className={cn("pb-12", visibleTab !== "about" && "hidden")}>{aboutPanel}</div>
      )}
      {isOwnProfile && (
        <div className={cn("pb-12", visibleTab !== "saved" && "hidden")}>{savedPanel}</div>
      )}
    </>
  );
}
