"use client";

import { useTransition } from "react";
import { Edit01, Trash01, DownloadCloud02, HeartRounded, Bookmark } from "@untitledui/icons";

import { LinkedInIcon } from "@/components/icons";
import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";
import { apiFetch, HttpError } from "@/lib/query/fetcher";
import { urls } from "@/lib/urls";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Button } from "@/components/base/buttons/button";
import { Tooltip } from "@/components/base/tooltip/tooltip";

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
  const [isSharing, startSharing] = useTransition();

  /** Queues the share on the server and reports what actually happened. */
  const shareToLinkedIn = () => {
    startSharing(async () => {
      try {
        const { detail } = await apiFetch<{ detail: string }>(
          `/api/blogs/${slug}/share-linkedin/`,
          { method: "POST" },
        );
        addMessage(detail, "success");
      } catch (error) {
        addMessage(
          error instanceof HttpError ? error.message : "Could not share to LinkedIn.",
          "error",
        );
      }
    });
  };

  const isAuthor = user?.username === authorUsername;
  const liked = isLiked(blogId);
  const saved = isSaved(blogId);

  /**
   * A plain link to the server-rendered PDF — the same file the LinkedIn share
   * attaches, so this is how an author checks what their network will see.
   * It used to open a print-styled page and trigger `window.print()` behind a
   * 600ms fake spinner; there is a real file to fetch now, and the browser's
   * own loading indicator is honest about how long it takes.
   */
  const pdfButton = (
    <ButtonUtility
      size="sm"
      color="tertiary"
      tooltip="View PDF"
      icon={DownloadCloud02}
      href={urls.blogPdf(slug)}
      target="_blank"
      rel="noopener noreferrer"
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
                shareToLinkedIn();
              }}
              className="inline"
            >
              <Tooltip title="Share to LinkedIn">
                <Button
                  type="submit"
                  size="sm"
                  color="tertiary"
                  iconLeading={LinkedInIcon}
                  isDisabled={isSharing}
                >
                  {isSharing ? "Sharing…" : "Share"}
                </Button>
              </Tooltip>
            </form>
          ) : (
            <Tooltip title="View on LinkedIn">
              <Button size="sm" color="tertiary" iconLeading={LinkedInIcon} href={linkedinPostUrl ?? "#"} target={linkedinPostUrl ? "_blank" : undefined}>
                Shared
              </Button>
            </Tooltip>
          ))}

        {pdfButton}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:ml-auto">
      {postedOnLinkedin && linkedinPostUrl && (
        <Tooltip title="View on LinkedIn">
          <Button size="sm" color="tertiary" iconLeading={LinkedInIcon} href={linkedinPostUrl} target="_blank" className="mr-1">
            Shared
          </Button>
        </Tooltip>
      )}

      {user ? (
        <>
          <form onSubmit={(event) => { event.preventDefault(); toggleLike(blogId, slug); }}>
            <Tooltip title={liked ? "Unlike" : "Like"}>
              <Button
                type="submit"
                size="sm"
                color={liked ? "tertiary-destructive" : "tertiary"}
                iconLeading={HeartRounded}
              >
                {likeCountFor(blogId, baseLikeCount).toString()}
              </Button>
            </Tooltip>
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
          <ButtonUtility
            size="sm"
            color="tertiary"
            icon={HeartRounded}
            href={urls.accountLogin()}
            tooltip="Like"
          />
          <ButtonUtility
            size="sm"
            color="tertiary"
            icon={Bookmark}
            href={urls.accountLogin()}
            tooltip="Save"
          />
        </>
      )}

      {pdfButton}
    </div>
  );
}

