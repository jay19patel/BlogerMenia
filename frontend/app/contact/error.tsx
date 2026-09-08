"use client";

import { RouteError } from "@/components/route-error";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError {...props} title="The contact page didn't load" message="We could not reach the API. You can still email us directly." />;
}
