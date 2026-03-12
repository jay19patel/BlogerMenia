import { Suspense } from "react";
import CreatorsList from "@/components/CreatorsList";

export const metadata = {
    title: "Our Top Creators - BlogerMenia",
    description: "Discover the brilliant minds behind BlogerMenia's most engaging stories.",
};

export default function CreatorsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>}>
            <CreatorsList />
        </Suspense>
    );
}
