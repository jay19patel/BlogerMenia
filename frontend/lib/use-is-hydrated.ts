import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` while rendering on the server and during the first client render,
 * `true` afterwards.
 *
 * Use it to gate anything that has no server equivalent — a `createPortal`
 * target, `window`, `localStorage` — so the markup React hydrates matches what
 * the server sent. Unlike a `useState` + `useEffect` pair this reports the
 * change through React's external-store channel, so it needs no state write
 * inside an effect.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
