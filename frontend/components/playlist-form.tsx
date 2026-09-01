"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useMessages } from "@/components/messages-provider";
import { RawSvg } from "@/components/raw-svg";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";

import "../app/playlists/playlist-form.css";

/**
 * `blog/playlist_form.html` — the three-column playlist editor.
 *
 * The original ships a plain-JS script that shuffles hidden checkbox rows
 * between the "In this playlist" and "Your library" columns; here the same
 * layout is driven by React state, with identical markup for each row.
 */

/** One row of the blog picker — the subset of `Blog` the editor needs. */
export interface PlaylistPickerBlog {
  id: number;
  title: string;
  image: string | null;
  avatar_svg: string;
  category_name: string | null;
  created_at_label: string;
  author_username: string;
}

interface PlaylistFormProps {
  blogs: PlaylistPickerBlog[];
  initialTitle?: string;
  initialDescription?: string;
  initialImage?: string | null;
  initialBlogIds?: number[];
  submitLabel: string;
  successHref: string;
}

const ADD_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const REMOVE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

function BlogRow({
  blog,
  included,
  onToggle,
}: {
  blog: PlaylistPickerBlog;
  included: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="blog-item group flex items-center gap-3 rounded-xl border border-slate-100 hover:border-slate-200 p-2.5 transition-colors">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 [&>svg]:w-full [&>svg]:h-full">
        {blog.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- matches the original picker markup.
          <img src={blog.image} className="w-full h-full object-cover" alt="" />
        ) : (
          <RawSvg html={blog.avatar_svg} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">{blog.title}</p>
        <p className="text-xs text-slate-400">
          {blog.category_name ?? "Article"} · {blog.created_at_label}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={included ? `Remove ${blog.title}` : `Add ${blog.title}`}
        className={`toggle-btn shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          included
            ? "bg-red-50 text-red-500 hover:bg-red-100"
            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
        }`}
      >
        {included ? REMOVE_ICON : ADD_ICON}
      </button>
    </div>
  );
}

export function PlaylistForm({
  blogs,
  initialTitle = "",
  initialDescription = "",
  initialImage = null,
  initialBlogIds = [],
  submitLabel,
  successHref,
}: PlaylistFormProps) {
  const router = useRouter();
  const { user } = useSession();
  const { addMessage } = useMessages();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialImage);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialBlogIds);
  const [search, setSearch] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  // `PlaylistForm.__init__` limits the picker to the signed-in author's blogs.
  const ownBlogs = useMemo(
    () => blogs.filter((blog) => blog.author_username === user?.username),
    [blogs, user?.username],
  );

  const included = ownBlogs.filter((blog) => selectedIds.includes(blog.id));
  const library = ownBlogs.filter((blog) => !selectedIds.includes(blog.id));
  const needle = search.trim().toLowerCase();
  const visibleLibrary = library.filter((blog) => blog.title.toLowerCase().includes(needle));

  const toggle = (id: number) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );

  const onCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
  };

  return (
    <form
      className="playlist-form"
      method="post"
      encType="multipart/form-data"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          setTitleError("This field is required.");
          return;
        }
        setTitleError(null);
        addMessage("Static demo — the playlist was not saved.", "warning");
        router.push(successHref);
      }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: playlist details */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5 self-start">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Playlist details</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cover image</label>
            <label
              htmlFor="id_image"
              className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 transition-colors bg-slate-50 overflow-hidden"
            >
              <div className={`${coverPreview ? "block" : "hidden"} aspect-video`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- object URLs cannot go through next/image. */}
                <img src={coverPreview ?? ""} className="w-full h-full object-cover" alt="" />
              </div>
              <div
                className={`${coverPreview ? "hidden" : "flex"} flex-col items-center justify-center gap-2 py-10 text-slate-400`}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-xs font-medium">Click to upload</span>
              </div>
            </label>
            <div className="hidden">
              <input id="id_image" name="image" type="file" accept="image/*" onChange={onCoverChange} />
            </div>
          </div>

          <div>
            <label htmlFor="id_title" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="id_title"
              name="title"
              type="text"
              maxLength={200}
              placeholder="e.g., Essential Reading for Builders"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {titleError && <p className="mt-1 text-xs text-red-500">{titleError}</p>}
          </div>

          <div>
            <label htmlFor="id_description" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Description
            </label>
            <textarea
              id="id_description"
              name="description"
              rows={4}
              placeholder="What is this collection about?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        {/* Middle: included blogs */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col self-start min-h-[420px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">In this playlist</h2>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
              {included.length}
            </span>
          </div>
          <div className="space-y-2 flex-1">
            {included.map((blog) => (
              <BlogRow key={blog.id} blog={blog} included onToggle={() => toggle(blog.id)} />
            ))}
          </div>
          {included.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center flex-1 text-slate-400 py-8">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <p className="text-xs mt-3 max-w-[200px]">
                Add articles from your library to build this playlist.
              </p>
            </div>
          )}
        </div>

        {/* Right: library */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col self-start min-h-[420px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Your library</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
              {library.length}
            </span>
          </div>
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              aria-label="Search your library"
              placeholder="Search your library..."
              className="pl-9!"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[520px] pr-1">
            {visibleLibrary.map((blog) => (
              <BlogRow key={blog.id} blog={blog} included={false} onToggle={() => toggle(blog.id)} />
            ))}
          </div>
          {visibleLibrary.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">No articles found.</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {submitLabel}
        </button>
        <Link href={urls.playlistList()} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}
