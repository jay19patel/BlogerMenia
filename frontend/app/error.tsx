"use client";

import { RouteError } from "@/components/route-error";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError {...props} title="Something went wrong" message="We could not load this page. It may be a temporary problem with the API." />;
}
