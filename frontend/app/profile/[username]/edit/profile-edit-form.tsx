"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useMessages } from "@/components/messages-provider";
import { urls } from "@/lib/urls";
import type { User } from "@/lib/types";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Toggle } from "@/components/base/toggle/toggle";

import { updateProfileAction } from "./actions";

/**
 * `ProfileUpdateView`'s model form as rendered by `blog/profile_edit.html`.
 * Field order and labels follow the view's `fields` list.
 */
export function ProfileEditForm({ profileUser }: { profileUser: User }) {
  const router = useRouter();
  const { addMessage } = useMessages();
  const [isPending, setIsPending] = useState(false);

  const [values, setValues] = useState({
    first_name: profileUser.first_name,
    last_name: profileUser.last_name,
    bio: profileUser.bio,
    about: profileUser.about,
    linkedin_url: profileUser.linkedin_url,
    auto_post_to_linkedin: profileUser.auto_post_to_linkedin,
  });

  const setValue = <K extends keyof typeof values>(field: K, value: (typeof values)[K]) =>
    setValues((current) => ({ ...current, [field]: value }));

  return (
    <form
      className="space-y-6"
      encType="multipart/form-data"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsPending(true);
        try {
          const formData = new FormData(event.currentTarget);
          await updateProfileAction(profileUser.username, formData);
          addMessage("Profile updated successfully.", "success");
        } catch (error) {
          addMessage("Failed to update profile.", "error");
          setIsPending(false);
        }
      }}
    >
      <div>
        <Input
          id="id_first_name"
          name="first_name"
          type="text"
          label="First name"
          maxLength={150}
          value={values.first_name}
          onChange={(value) => setValue("first_name", value)}
        />
      </div>

      <div>
        <Input
          id="id_last_name"
          name="last_name"
          type="text"
          label="Last name"
          maxLength={150}
          value={values.last_name}
          onChange={(value) => setValue("last_name", value)}
        />
      </div>

      <div>
        <TextArea
          id="id_bio"
          name="bio"
          label="Bio"
          maxLength={500}
          value={values.bio}
          onChange={(value) => setValue("bio", value)}
        />
      </div>

      <div>
        <TextArea
          id="id_about"
          name="about"
          label="About"
          value={values.about}
          onChange={(value) => setValue("about", value)}
        />
      </div>

      <div>
        <label htmlFor="id_profile_picture" className="block text-xs font-semibold text-slate-600 mb-1.5">
          Profile picture
        </label>
        <input id="id_profile_picture" name="profile_picture" type="file" accept="image/*" className="fld" />
      </div>

      <div>
        <Input
          id="id_linkedin_url"
          name="linkedin_url"
          type="url"
          label="Linkedin url"
          value={values.linkedin_url}
          onChange={(value) => setValue("linkedin_url", value)}
        />
      </div>

      <div>
        <Toggle
          name="auto_post_to_linkedin"
          isSelected={values.auto_post_to_linkedin}
          onChange={(checked) => setValue("auto_post_to_linkedin", checked)}
          label="Auto post to linkedin"
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
        <Link
          href={urls.userProfile(profileUser.username)}
          className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
