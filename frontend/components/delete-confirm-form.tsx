"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMessages } from "@/components/messages-provider";

/**
 * The confirm form shared by `blog/blog_confirm_delete.html` and
 * `blog/playlist_confirm_delete.html`.
 *
 * There is no backend to delete from, so the form redirects the way the Django
 * `DeleteView` did and says plainly that the fixtures are read-only.
 */
export function DeleteConfirmForm({
  cancelHref,
  successHref,
}: {
  cancelHref: string;
  successHref: string;
}) {
  const router = useRouter();
  const { addMessage } = useMessages();

  return (
    <form
      className="flex items-center justify-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        addMessage("Static demo — nothing was deleted, the fixture data is read-only.", "warning");
        router.push(successHref);
      }}
    >
      <Link
        href={cancelHref}
        className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
      >
        Keep it
      </Link>
      <button
        type="submit"
        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
      >
        Yes, delete
      </button>
    </form>
  );
}
