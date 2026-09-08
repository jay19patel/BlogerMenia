import { NextResponse } from "next/server";

import { blogs } from "@/lib/api";
import { isSameOrigin } from "@/lib/auth/guards";
import { errorResponse, forbidden } from "@/lib/auth/route-helpers";
import { readAccessToken } from "@/lib/auth/session";

/**
 * `POST /api/blogs/<slug>/share-linkedin`
 *
 * Queues a real share. The button that opens this used to only show a toast,
 * and the endpoint behind it only flipped a flag — so the UI reported a share
 * that never happened.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isSameOrigin())) return forbidden();
  try {
    const { slug } = await params;
    return NextResponse.json(await blogs.shareBlogToLinkedIn(slug, await readAccessToken()));
  } catch (error) {
    return errorResponse(error);
  }
}
