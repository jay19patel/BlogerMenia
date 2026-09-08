import { NextResponse } from "next/server";

import { blogs } from "@/lib/api";
import { readAccessToken } from "@/lib/auth/session";
import { errorResponse } from "@/lib/auth/route-helpers";

/**
 * `GET /api/blogs/<slug>/pdf`
 *
 * The reader's route to the PDF Django renders — the same bytes the LinkedIn
 * share uploads as a document, so what the author reviews here is exactly what
 * their network sees.
 *
 * It goes through the BFF like everything else: the browser has no route to
 * Django, and the access token that lets an author fetch the PDF of their own
 * unpublished draft lives in an httpOnly cookie only this server can read.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const { data, contentType } = await blogs.getBlogPdf(slug, await readAccessToken());

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        // `inline` opens the browser's own viewer instead of dropping a file in
        // Downloads — the point is to look at it before sharing.
        "Content-Disposition": `inline; filename="${slug}.pdf"`,
        // The render is already cached server-side against the post's
        // `updated_at`; this keeps a reload from crossing the network at all.
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
