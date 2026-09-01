"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useMessages } from "@/components/messages-provider";
import { urls } from "@/lib/urls";
import type { User } from "@/lib/types";

import "./profile-form.css";

/**
 * `ProfileUpdateView`'s model form as rendered by `blog/profile_edit.html`.
 * Field order and labels follow the view's `fields` list.
 */
export function ProfileEditForm({ profileUser }: { profileUser: User }) {
  const router = useRouter();
  const { addMessage } = useMessages();

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
      className="profile-edit-form space-y-6"
      encType="multipart/form-data"
      onSubmit={(event) => {
        event.preventDefault();
        addMessage("Static demo — profile changes are not saved.", "warning");
        router.push(urls.userProfile(profileUser.username));
      }}
    >
      <div>
        <label htmlFor="id_first_name" className="block text-xs font-semibold text-slate-600 mb-1.5">
          First name
        </label>
        <input
          id="id_first_name"
          name="first_name"
          type="text"
          maxLength={150}
          value={values.first_name}
          onChange={(event) => setValue("first_name", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="id_last_name" className="block text-xs font-semibold text-slate-600 mb-1.5">
          Last name
        </label>
        <input
          id="id_last_name"
          name="last_name"
          type="text"
          maxLength={150}
          value={values.last_name}
          onChange={(event) => setValue("last_name", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="id_bio" className="block text-xs font-semibold text-slate-600 mb-1.5">
          Bio
        </label>
        <textarea
          id="id_bio"
          name="bio"
          maxLength={500}
          value={values.bio}
          onChange={(event) => setValue("bio", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="id_about" className="block text-xs font-semibold text-slate-600 mb-1.5">
          About
        </label>
        <textarea
          id="id_about"
          name="about"
          value={values.about}
          onChange={(event) => setValue("about", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="id_profile_picture" className="block text-xs font-semibold text-slate-600 mb-1.5">
          Profile picture
        </label>
        <input id="id_profile_picture" name="profile_picture" type="file" accept="image/*" />
      </div>

      <div>
        <label htmlFor="id_linkedin_url" className="block text-xs font-semibold text-slate-600 mb-1.5">
          Linkedin url
        </label>
        <input
          id="id_linkedin_url"
          name="linkedin_url"
          type="url"
          value={values.linkedin_url}
          onChange={(event) => setValue("linkedin_url", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="id_auto_post_to_linkedin" className="block text-xs font-semibold text-slate-600 mb-1.5">
          Auto post to linkedin
        </label>
        <input
          id="id_auto_post_to_linkedin"
          name="auto_post_to_linkedin"
          type="checkbox"
          checked={values.auto_post_to_linkedin}
          onChange={(event) => setValue("auto_post_to_linkedin", event.target.checked)}
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          Save changes
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
