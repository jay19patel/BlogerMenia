import { NextResponse } from "next/server";

import { misc } from "@/lib/api";
import { errorResponse } from "@/lib/auth/route-helpers";

/**
 * `GET /api/search?q=…`
 *
 * The browser's entry point to search. Keeping it behind the BFF means the
 * fixtures — and, later, the Django host and its credentials — stay on the
 * server, and the client bundle carries no data layer at all.
 */
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return NextResponse.json({ query, results: [] });
    return NextResponse.json({ query, results: await misc.search(query) });
  } catch (error) {
    return errorResponse(error);
  }
}
