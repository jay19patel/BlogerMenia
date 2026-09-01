"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { apiFetch, HttpError } from "@/lib/query/fetcher";
import { queryKeys } from "@/lib/query/keys";
import type { Viewer } from "@/lib/types";

/**
 * The signed-in viewer.
 *
 * State of record lives in httpOnly cookies on the server; this hook reads it
 * through `GET /api/auth/session`, which also refreshes a stale access token.
 * No token is ever visible to JavaScript, so an XSS cannot exfiltrate one.
 *
 * Pages render their signed-out variant on the server (that is what search
 * engines and the static build see) and this fills in the authenticated parts
 * once the session resolves.
 */

interface SessionResponse {
  user: Viewer | null;
}

interface SessionValue {
  /** `false` until the first session fetch settles. */
  ready: boolean;
  user: Viewer | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (payload: { email: string; password1: string; password2: string }) => Promise<void>;
  logout: () => Promise<void>;
  isLiked: (blogId: number) => boolean;
  isSaved: (blogId: number) => boolean;
  toggleLike: (blogId: number, slug: string) => void;
  toggleSave: (blogId: number, slug: string) => void;
  /** Server count adjusted by this viewer's own like. */
  likeCountFor: (blogId: number, baseCount: number) => number;
}

const SessionContext = createContext<SessionValue | null>(null);

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: queryKeys.session,
    queryFn: () => apiFetch<SessionResponse>("/api/auth/session/"),
    staleTime: 5 * 60_000,
  });

  const user = data?.user ?? null;

  const setSession = useCallback(
    (next: SessionResponse) => queryClient.setQueryData(queryKeys.session, next),
    [queryClient],
  );

  /** Optimistically flip a like/bookmark, then tell the server. */
  const patchViewer = useCallback(
    (patch: (viewer: Viewer) => Viewer) => {
      queryClient.setQueryData<SessionResponse>(queryKeys.session, (current) =>
        current?.user ? { user: patch(current.user) } : current,
      );
    },
    [queryClient],
  );

  const likeMutation = useMutation({
    mutationFn: (slug: string) => apiFetch(`/api/blogs/${slug}/like/`, { method: "POST" }),
  });

  const saveMutation = useMutation({
    mutationFn: (slug: string) => apiFetch(`/api/blogs/${slug}/save/`, { method: "POST" }),
  });

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const result = await apiFetch<SessionResponse>("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      setSession(result);
    },
    [setSession],
  );

  const signup = useCallback(
    async (payload: { email: string; password1: string; password2: string }) => {
      const result = await apiFetch<SessionResponse>("/api/auth/signup/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSession(result);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout/", { method: "POST" });
    setSession({ user: null });
  }, [setSession]);

  const value = useMemo<SessionValue>(() => {
    const liked = user?.liked_blog_ids ?? [];
    const saved = user?.saved_blog_ids ?? [];

    return {
      ready: !isPending,
      user,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      isLiked: (blogId) => liked.includes(blogId),
      isSaved: (blogId) => saved.includes(blogId),
      toggleLike: (blogId, slug) => {
        patchViewer((viewer) => ({ ...viewer, liked_blog_ids: toggleId(viewer.liked_blog_ids, blogId) }));
        likeMutation.mutate(slug, {
          onError: (error) => {
            // Roll the optimistic change back unless the failure is the mock
            // backend telling us it does not persist writes.
            if (error instanceof HttpError && error.status === 503) return;
            patchViewer((viewer) => ({ ...viewer, liked_blog_ids: toggleId(viewer.liked_blog_ids, blogId) }));
          },
        });
      },
      toggleSave: (blogId, slug) => {
        patchViewer((viewer) => ({ ...viewer, saved_blog_ids: toggleId(viewer.saved_blog_ids, blogId) }));
        saveMutation.mutate(slug, {
          onError: (error) => {
            if (error instanceof HttpError && error.status === 503) return;
            patchViewer((viewer) => ({ ...viewer, saved_blog_ids: toggleId(viewer.saved_blog_ids, blogId) }));
          },
        });
      },
      likeCountFor: (blogId, baseCount) => baseCount + (liked.includes(blogId) ? 1 : 0),
    };
  }, [isPending, likeMutation, login, logout, patchViewer, saveMutation, signup, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside a <SessionProvider>");
  return context;
}
