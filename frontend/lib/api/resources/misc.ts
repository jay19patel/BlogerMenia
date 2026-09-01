import "server-only";

import { z } from "zod";

import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { categorySchema, paginated, searchResponseSchema, type ContactPayload } from "@/lib/api/schemas";
import { toCategory } from "@/lib/models";
import type { Category, SearchResult } from "@/lib/types";

const categoryPage = paginated(categorySchema);

/** `blogermenia.context_processors.global_context` */
export async function listCategories(): Promise<Category[]> {
  const data = await request(categoryPage, { path: endpoints.categories(), next: { tags: ["categories"] } });
  return data.results.map(toCategory);
}

/** Powers the header dropdown — `search.views.search_api`. */
export async function search(query: string): Promise<SearchResult[]> {
  const data = await request(searchResponseSchema, { path: endpoints.search(), query: { q: query } });
  return data.results;
}

const detailSchema = z.object({ detail: z.string() });

export async function submitContact(payload: ContactPayload) {
  return request(detailSchema, { path: endpoints.contact(), method: "POST", body: payload });
}
