import { NextResponse } from "next/server";

import { blogs } from "@/lib/api";
import { isSameOrigin } from "@/lib/auth/guards";
import { readAccessToken } from "@/lib/auth/session";
import { errorResponse, forbidden } from "@/lib/auth/route-helpers";

/** `POST /api/blogs/<slug>/like` — proxies `BlogLikeView` with the cookie token. */
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isSameOrigin())) return forbidden();
  try {
    const { slug } = await params;
    return NextResponse.json(await blogs.likeBlog(slug, await readAccessToken()));
  } catch (error) {
    return errorResponse(error);
  }
}
