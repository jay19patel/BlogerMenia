"use client";

import Link from "next/link";
import { useState } from "react";

import { LinkedInIcon } from "@/components/linkedin-icon";
import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

/**
 * The action cluster on the right of the author bar in `blog/blog_detail.html`:
 * edit / share / delete for the author, like / save for everyone else, and the
 * PDF button both variants share.
 *
 * The like and save buttons behave like the original AJAX handlers — optimistic
 * toggle, no page reload — only the state lives in the browser instead of the
 * `Like` and `saved_blogs` tables.
 */
export function BlogActions({
  blogId,
  slug,
  authorUsername,
  authorHasLinkedIn,
  postedOnLinkedin,
  linkedinPostUrl,
  baseLikeCount,
}: {
  blogId: number;
  slug: string;
  authorUsername: string;
  authorHasLinkedIn: boolean;
  postedOnLinkedin: boolean;
  linkedinPostUrl: string | null;
  baseLikeCount: number;
}) {
  const { user, isLiked, isSaved, toggleLike, toggleSave, likeCountFor } = useSession();
  const { addMessage } = useMessages();
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const isAuthor = user?.username === authorUsername;
  const liked = isLiked(blogId);
  const saved = isSaved(blogId);

  const downloadPdf = () => {
    setGeneratingPdf(true);
    window.setTimeout(() => {
      window.open(urls.blogPdf(slug), "_blank", "noopener,noreferrer");
      setGeneratingPdf(false);
    }, 600);
  };

  const pdfButton = (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={generatingPdf}
      className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors relative"
      title={generatingPdf ? "Generating PDF..." : "Download PDF"}
    >
      {generatingPdf ? (
        <svg className="animate-spin w-4 h-4 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
    </button>
  );

  if (isAuthor) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link
          href={urls.blogUpdate(slug)}
          className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors"
        >
          Edit
        </Link>

        {authorHasLinkedIn &&
          (!postedOnLinkedin ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addMessage("Your blog is being shared to LinkedIn and will appear shortly.", "info");
              }}
              className="inline"
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#0A66C2]/30 rounded-lg text-[#0A66C2] hover:bg-blue-50 transition-colors"
                title="Share on LinkedIn"
              >
                <LinkedInIcon />
                Share
              </button>
            </form>
          ) : (
            <a
              href={linkedinPostUrl ?? "#"}
              {...(linkedinPostUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#0A66C2]/30 rounded-lg text-[#0A66C2] bg-blue-50 hover:bg-blue-100 transition-colors"
              title="View on LinkedIn"
            >
              <LinkedInIcon />
              Shared
            </a>
          ))}

        <Link
          href={urls.blogDelete(slug)}
          className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
        >
          Delete
        </Link>

        {pdfButton}
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      {postedOnLinkedin && linkedinPostUrl && (
        <a
          href={linkedinPostUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#0A66C2]/30 rounded-lg text-[#0A66C2] bg-blue-50 hover:bg-blue-100 transition-colors mr-1"
          title="View on LinkedIn"
        >
          <LinkedInIcon />
          Shared
        </a>
      )}

      {user ? (
        <>
          <form onSubmit={(event) => { event.preventDefault(); toggleLike(blogId, slug); }}>
            <button
              type="submit"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                liked
                  ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="text-sm">{liked ? "♥" : "♡"}</span>
              <span>{likeCountFor(blogId, baseLikeCount)}</span>
            </button>
          </form>
          <form onSubmit={(event) => { event.preventDefault(); toggleSave(blogId, slug); }}>
            <button
              type="submit"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors text-sm ${
                saved
                  ? "bg-brand-50 border-brand-200 text-brand-600 hover:bg-brand-100"
                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300"
              }`}
              title="Save"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            </button>
          </form>
        </>
      ) : (
        <>
          <Link
            href={urls.accountLogin()}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-colors text-sm"
            title="Like"
          >
            ♡
          </Link>
          <Link
            href={urls.accountLogin()}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-colors text-sm"
            title="Save"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </Link>
        </>
      )}

      {pdfButton}
    </div>
  );
}
