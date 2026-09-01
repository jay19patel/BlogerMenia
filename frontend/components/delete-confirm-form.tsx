"use client";

import { useRouter } from "next/navigation";

import { useMessages } from "@/components/messages-provider";
import { Button } from "@/components/base/buttons/button";

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
      <Button
        size="md"
        color="secondary"
        href={cancelHref}
      >
        Keep it
      </Button>
      <Button
        type="submit"
        size="md"
        color="primary-destructive"
      >
        Yes, delete
      </Button>
    </form>
  );
}
