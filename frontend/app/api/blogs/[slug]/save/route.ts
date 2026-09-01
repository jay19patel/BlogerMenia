import { NextResponse } from "next/server";

import { blogs } from "@/lib/api";
import { isSameOrigin } from "@/lib/auth/guards";
import { readAccessToken } from "@/lib/auth/session";
import { errorResponse, forbidden } from "@/lib/auth/route-helpers";

/** `POST /api/blogs/<slug>/save` — proxies `BlogSaveView` with the cookie token. */
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isSameOrigin())) return forbidden();
  try {
    const { slug } = await params;
    await blogs.saveBlog(slug, await readAccessToken());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
