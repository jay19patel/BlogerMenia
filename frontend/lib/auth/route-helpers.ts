import "server-only";

import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";

/** Render an `ApiError` (or anything unexpected) as a DRF-shaped JSON response. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const body =
      Object.keys(error.fieldErrors).length > 0
        ? { detail: error.message, ...error.fieldErrors }
        : { detail: error.message };
    return NextResponse.json(body, { status: error.status });
  }
  console.error("Unhandled route error:", error);
  return NextResponse.json({ detail: "Something went wrong." }, { status: 500 });
}

export function forbidden(detail = "Cross-origin request rejected."): NextResponse {
  return NextResponse.json({ detail }, { status: 403 });
}
