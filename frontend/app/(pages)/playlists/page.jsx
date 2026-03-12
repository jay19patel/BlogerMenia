import { Suspense } from "react";
import PlaylistsList from "@/components/PlaylistsList";

export const metadata = {
    title: "Public Playlists - BlogerMenia",
    description: "Explore curated collections of great blogs and learning paths.",
};

export default function PlaylistsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>}>
            <PlaylistsList />
        </Suspense>
    );
}
