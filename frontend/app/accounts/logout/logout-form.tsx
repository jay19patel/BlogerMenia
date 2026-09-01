"use client";

import { useRouter } from "next/navigation";

import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

/** The confirm form of `account/logout.html`. */
export function LogoutForm() {
  const router = useRouter();
  const { logout } = useSession();

  return (
    <form
      method="POST"
      className="flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        logout();
        router.push(urls.home());
      }}
    >
      <button
        type="submit"
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
      >
        Log out
      </button>
    </form>
  );
}
