"use client";

import { useState } from "react";
import { Edit01, Trash01, DownloadCloud02, HeartRounded, Bookmark } from "@untitledui/icons";

import { LinkedInIcon } from "@/components/icons";
import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Button } from "@/components/base/buttons/button";

/** Shown in place of the download icon while the print view is being opened. */
function PdfSpinner() {
  return (
    <svg className="animate-spin" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

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
    <ButtonUtility
      size="sm"
      color="tertiary"
      tooltip={generatingPdf ? "Generating PDF..." : "Download PDF"}
      icon={generatingPdf ? <PdfSpinner /> : DownloadCloud02}
      onClick={downloadPdf}
      isDisabled={generatingPdf}
    />
  );

  if (isAuthor) {
    return (
      <div className="flex items-center gap-2 sm:ml-auto">
        <ButtonUtility size="sm" color="tertiary" tooltip="Edit" icon={Edit01} href={urls.blogUpdate(slug)} />
        <ButtonUtility size="sm" color="tertiary" tooltip="Delete" icon={Trash01} href={urls.blogDelete(slug)} />

        {authorHasLinkedIn &&
          (!postedOnLinkedin ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addMessage("Your blog is being shared to LinkedIn and will appear shortly.", "info");
              }}
              className="inline"
            >
              <Button type="submit" size="sm" color="tertiary" iconLeading={LinkedInIcon}>
                Share
              </Button>
            </form>
          ) : (
            <Button size="sm" color="tertiary" iconLeading={LinkedInIcon} href={linkedinPostUrl ?? "#"} target={linkedinPostUrl ? "_blank" : undefined}>
              Shared
            </Button>
          ))}

        {pdfButton}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:ml-auto">
      {postedOnLinkedin && linkedinPostUrl && (
        <Button size="sm" color="tertiary" iconLeading={LinkedInIcon} href={linkedinPostUrl} target="_blank" className="mr-1">
          Shared
        </Button>
      )}

      {user ? (
        <>
          <form onSubmit={(event) => { event.preventDefault(); toggleLike(blogId, slug); }}>
            <Button
              type="submit"
              size="sm"
              color={liked ? "tertiary-destructive" : "tertiary"}
              iconLeading={HeartRounded}
            >
              {likeCountFor(blogId, baseLikeCount).toString()}
            </Button>
          </form>
          <form onSubmit={(event) => { event.preventDefault(); toggleSave(blogId, slug); }}>
            <ButtonUtility
              type="submit"
              size="sm"
              color="tertiary"
              tooltip={saved ? "Unsave" : "Save"}
              icon={Bookmark}
              className={saved ? "text-brand-600 border-brand-200 bg-brand-50" : ""}
            />
          </form>
        </>
      ) : (
        <>
          <Button size="sm" color="tertiary" iconLeading={HeartRounded} href={urls.accountLogin()} />
          <ButtonUtility size="sm" color="tertiary" icon={Bookmark} href={urls.accountLogin()} tooltip="Save" />
        </>
      )}

      {pdfButton}
    </div>
  );
}

