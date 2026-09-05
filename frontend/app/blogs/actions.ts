"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { blogs } from "@/lib/api";
import { readAccessToken } from "@/lib/auth/session";
import { urls } from "@/lib/urls";

export async function saveBlogAction(
  isEdit: boolean,
  originalSlug: string | undefined,
  formData: FormData
) {
  const token = await readAccessToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  // Remove image from form data if it's empty
  const image = formData.get("image");
  if (image instanceof File && image.size === 0) {
    formData.delete("image");
  }

  // Convert string true/false back to boolean for checkboxes that didn't submit
  const booleans = ["is_published", "featured", "posted_on_linkedin"];
  for (const field of booleans) {
    const val = formData.get(field);
    formData.set(field, val === "on" || val === "true" ? "true" : "false");
  }

  let result;
  if (isEdit && originalSlug) {
    result = await blogs.updateBlog(originalSlug, formData, token);
  } else {
    result = await blogs.createBlog(formData, token);
  }

  revalidateTag("blogs");
  if (isEdit && originalSlug) {
    revalidateTag(`blog:${originalSlug}`);
  }
  revalidateTag(`blog:${result.slug}`);

  // We can't redirect directly inside a try/catch if the caller wraps this,
  // but it's usually safe if the caller is client-side. We will return the slug.
  return { slug: result.slug };
}
