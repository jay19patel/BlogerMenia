"use client";

import type { ReactNode } from "react";

import { MessagesProvider } from "@/components/messages-provider";
import { SessionProvider } from "@/components/session-provider";
import { QueryProvider } from "@/lib/query/provider";

/** Client-side context the whole app sits inside. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SessionProvider>
        <MessagesProvider>{children}</MessagesProvider>
      </SessionProvider>
    </QueryProvider>
  );
}
