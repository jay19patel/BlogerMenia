import "server-only";

import { z } from "zod";

import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import {
  categorySchema,
  detailSchema,
  searchResponseSchema,
  type ContactPayload,
} from "@/lib/api/schemas";
import { toCategory } from "@/lib/models";
import type { Category, SearchResult } from "@/lib/types";

/** `CategoryListView` is unpaginated — it is a handful of reference rows read
 *  on every page render, and it is cached server-side. */
const categoryList = z.array(categorySchema);

export async function listCategories(): Promise<Category[]> {
  const data = await request(categoryList, {
    path: endpoints.categories(),
    next: { tags: ["categories"] },
  });
  return data.map(toCategory);
}

/** Powers the header dropdown and `/search` — `search.api.search_api`. */
export async function search(query: string): Promise<SearchResult[]> {
  const data = await request(searchResponseSchema, { path: endpoints.search(), query: { q: query } });
  return data.results;
}

/** Answers `{detail}`; it used to echo the stored row back, so a successful
 *  submission surfaced to the user as an error. */
export async function submitContact(payload: ContactPayload) {
  return request(detailSchema, { path: endpoints.contact(), method: "POST", body: payload });
}

/** `core.api.health` — used by the ops dashboard and uptime checks. */
const healthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.record(z.string(), z.object({ ok: z.boolean(), error: z.string().optional() })),
});

export async function health() {
  return request(healthSchema, { path: endpoints.health() });
}
