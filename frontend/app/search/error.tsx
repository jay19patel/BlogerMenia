"use client";

import { RouteError } from "@/components/route-error";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError {...props} title="Search is unavailable" message="Search could not be reached. It may be temporarily down — try again shortly." />;
}
