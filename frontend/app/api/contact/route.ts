import { NextResponse } from "next/server";

import { misc } from "@/lib/api";
import { contactPayloadSchema } from "@/lib/api/schemas";
import { isSameOrigin } from "@/lib/auth/guards";
import { errorResponse, forbidden } from "@/lib/auth/route-helpers";

/** `POST /api/contact` — `blog.views.home_views.ContactView`. */
export async function POST(request: Request) {
  if (!(await isSameOrigin())) return forbidden();

  try {
    const parsed = contactPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { detail: "Please correct the errors below.", ...parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(await misc.submitContact(parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
