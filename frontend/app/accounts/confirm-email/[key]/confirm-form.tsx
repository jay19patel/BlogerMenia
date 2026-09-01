"use client";

import { useRouter } from "next/navigation";

import { SubmitArrow } from "@/components/auth-shell";
import { useMessages } from "@/components/messages-provider";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

/**
 * The confirmable branch of `account/email_confirm.html`. The address shown is
 * the signed-in fixture account's, falling back to a placeholder for visitors
 * who reach the link while logged out.
 */
export function EmailConfirmForm() {
  const router = useRouter();
  const { user } = useSession();
  const { addMessage } = useMessages();
  const email = user?.email ?? "you@example.com";

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight mb-3">Confirm your email</h1>
      <p className="text-sm text-slate-500 leading-relaxed mb-6">
        Please confirm that <strong className="text-slate-900">{email}</strong> is your email address.
      </p>

      <form
        method="POST"
        onSubmit={(event) => {
          event.preventDefault();
          addMessage(`You have confirmed ${email}.`, "success");
          router.push(urls.home());
        }}
      >
        <button
          type="submit"
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Confirm email
          <SubmitArrow />
        </button>
      </form>
    </>
  );
}
