"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { users } from "@/lib/api";
import { readAccessToken } from "@/lib/auth/session";
import { urls } from "@/lib/urls";

export async function updateProfileAction(username: string, formData: FormData) {
  const token = await readAccessToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const autoPost = formData.get("auto_post_to_linkedin");
  formData.set("auto_post_to_linkedin", autoPost === "on" || autoPost === "true" ? "true" : "false");

  const profilePic = formData.get("profile_picture");
  if (profilePic instanceof File && profilePic.size === 0) {
    formData.delete("profile_picture");
  }

  await users.updateProfile(username, formData, token);

  revalidateTag("users");
  revalidateTag("currentUser");
  redirect(urls.userProfile(username));
}
