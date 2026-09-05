"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ExcalidrawModal, type ExcalidrawSceneData } from "@/components/excalidraw-modal";
import { useMessages } from "@/components/messages-provider";
import { RawSvg } from "@/components/raw-svg";
import { useSession } from "@/components/session-provider";
import { urls } from "@/lib/urls";
import type { BlogSection, SectionType } from "@/lib/types";

import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Toggle } from "@/components/base/toggle/toggle";
import { InputTags } from "@/components/base/input/input-tags";
import { cx } from "@/utils/cx";


/**
 * `blog/blog_form.html` — the structured post editor used by both
 * `BlogCreateView` and `BlogUpdateView`.
 *
 * Everything the original's inline script did lives here as React state: the
 * section builder with its ten block types, reordering, the slug that follows
 * the title until you touch it, the JSON importer, and the Excalidraw modal.
 */

const SECTION_TYPES: [SectionType, string][] = [
  ["text", "Text"],
  ["bullets", "Bullet Points"],
  ["code", "Code Block"],
  ["table", "Table"],
  ["youtube", "YouTube Video"],
  ["note", "Note / Callout"],
  ["links", "Links"],
  ["image", "Image"],
  ["flowchart", "Flowchart"],
  ["excalidraw", "Excalidraw Diagram"],
];

/** A section while it is being edited — the scene fields never reach the fixtures. */
interface EditorSection extends BlogSection {
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
  isCollapsed?: boolean;
}

export interface BlogEditorPlaylist {
  id: number;
  title: string;
  author_username: string;
}

export interface BlogEditorInitial {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  introduction: string;
  conclusion: string;
  category_name: string;
  tags: string[];
  is_published: boolean;
  featured: boolean;
  posted_on_linkedin: boolean;
  image_name: string | null;
  sections: BlogSection[];
  playlist_ids: number[];
}

function blankSection(type: SectionType): EditorSection {
  return {
    type,
    title: "",
    content: "",
    language: type === "code" ? "javascript" : "",
    items: [],
    headers: type === "table" ? ["Column A", "Column B"] : [],
    rows: type === "table" ? [["", ""]] : [],
    videoId: "",
    videoTitle: "",
    description: "",
    links: [],
    imageUrl: "",
    steps: [],
    elements: [],
    appState: {},
    svgData: "",
    caption: "",
    isCollapsed: false,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function typeLabel(type: SectionType): string {
  return SECTION_TYPES.find(([key]) => key === type)?.[1] ?? type;
}

/** Reads back the fields a JSON export may nest under `content`. */
function readImportedSections(raw: Record<string, unknown>): BlogSection[] | null {
  const content = (raw.content && typeof raw.content === "object" ? raw.content : raw) as Record<string, unknown>;
  const rawSections = (content.sections ?? raw.sections) as unknown;
  if (!Array.isArray(rawSections)) return null;

  return rawSections.map((entry) => {
    const section = entry as BlogSection & { attachment?: string };
    const base = { ...blankSection(section.type ?? "text"), ...section };
    if (section.type === "image") {
      base.imageUrl = section.imageUrl || section.content || section.attachment || "";
      base.description = section.description || section.caption || "";
    }
    if (section.type === "excalidraw") {
      base.svgData = section.svgData || section.content || "";
      base.caption = section.caption || section.description || "";
    }
    return base;
  });
}

interface FieldProps {
  /** The section key this input edits; becomes the field's `name`. */
  field: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  isCode?: boolean;
}

/**
 * One section-editor input.
 *
 * React Aria passes the new value to `onChange` directly, so the handler is
 * forwarded as-is rather than unwrapped from a DOM event.
 */
function Field({ field, placeholder, value, onChange, multiline, isCode }: FieldProps) {
  const shared = { name: field, placeholder, "aria-label": placeholder, value, onChange };
  return multiline ? (
    <TextArea
      {...shared}
      textAreaClassName={isCode ? "font-mono text-sm leading-relaxed" : undefined}
    />
  ) : (
    <Input {...shared} />
  );
}

export function BlogEditor({
  categories,
  playlists,
  initial,
  isEdit,
}: {
  categories: string[];
  playlists: BlogEditorPlaylist[];
  initial: BlogEditorInitial | null;
  isEdit: boolean;
}) {
  const router = useRouter();
  const { user } = useSession();
  const { addMessage } = useMessages();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [category, setCategory] = useState(initial?.category_name ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [introduction, setIntroduction] = useState(initial?.introduction ?? "");
  const [conclusion, setConclusion] = useState(initial?.conclusion ?? "");
  const [isPublished, setIsPublished] = useState(initial ? initial.is_published : true);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [postToLinkedIn, setPostToLinkedIn] = useState(
    initial?.posted_on_linkedin ?? user?.auto_post_to_linkedin ?? false,
  );
  const [selectedPlaylists, setSelectedPlaylists] = useState<number[]>(initial?.playlist_ids ?? []);
  const [sections, setSections] = useState<EditorSection[]>(initial?.sections ?? []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [excalidrawIndex, setExcalidrawIndex] = useState<number | null>(null);
  const [jsonStatus, setJsonStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userPlaylists = playlists.filter((playlist) => playlist.author_username === user?.username);
  const alreadyPosted = initial?.posted_on_linkedin ?? false;

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const [canDragIndex, setCanDragIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const reorderSections = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setSections((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const patchSection = (index: number, patch: Partial<EditorSection>) =>
    setSections((current) =>
      current.map((section, position) => (position === index ? { ...section, ...patch } : section)),
    );

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const importJson = (raw: unknown) => {
    const wrapper = raw as { blogs?: unknown[] } | null;
    const data = (Array.isArray(wrapper?.blogs) && wrapper.blogs.length ? wrapper.blogs[0] : raw) as
      | Record<string, unknown>
      | null;

    if (!data || typeof data !== "object") {
      setJsonStatus({ text: "That JSON has no blog data.", isError: true });
      return;
    }

    const readString = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : undefined);

    const importedTitle = readString("title");
    if (importedTitle !== undefined) setTitle(importedTitle);

    const importedSlug = readString("slug");
    if (importedSlug) {
      setSlug(importedSlug);
      setSlugTouched(true);
    } else if (importedTitle) {
      setSlug(slugify(importedTitle));
    }

    const importedSubtitle = readString("subtitle");
    if (importedSubtitle !== undefined) setSubtitle(importedSubtitle);
    const importedExcerpt = readString("excerpt");
    if (importedExcerpt !== undefined) setExcerpt(importedExcerpt);
    const importedCategory = readString("category_name") ?? readString("category");
    if (importedCategory !== undefined) setCategory(importedCategory);

    if (data.featured !== undefined) setFeatured(Boolean(data.featured));
    if (data.is_published !== undefined) setIsPublished(Boolean(data.is_published));
    if (Array.isArray(data.tags)) setTags(data.tags as string[]);
    else if (typeof data.tags === "string") setTags(data.tags.split(",").map(s => s.trim()));

    const content = (data.content && typeof data.content === "object" ? data.content : data) as Record<string, unknown>;
    if (typeof content.introduction === "string") setIntroduction(content.introduction);
    if (typeof content.conclusion === "string") setConclusion(content.conclusion);

    const importedSections = readImportedSections(data);
    if (importedSections) setSections(importedSections);

    setJsonStatus({ text: "JSON loaded — all fields populated. Review, then Publish.", isError: false });
  };

  const onJsonFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loaded) => {
      try {
        importJson(JSON.parse(String(loaded.target?.result ?? "")));
      } catch {
        setJsonStatus({ text: "Invalid JSON file — please check the format.", isError: true });
      }
    };
    reader.readAsText(file);
    // Allow re-uploading the same file.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      
      const postSlug = slug.trim() || slugify(title);
      formData.set("slug", postSlug);
      
      // We must serialize tags and sections as JSON strings since they are JSON fields.
      // DRF will parse them if they are sent as JSON strings in FormData.
      formData.set("tags", JSON.stringify(tags));
      formData.set("sections", JSON.stringify(sections.map(({ isCollapsed, ...s }) => s)));
      
      // Override the category to ensure it's sent properly if it's customized
      if (category) {
        formData.set("category_name", category);
      }

      // Checkboxes handling
      formData.set("is_published", isPublished ? "true" : "false");
      formData.set("featured", featured ? "true" : "false");
      formData.set("posted_on_linkedin", postToLinkedIn ? "true" : "false");

      // Handle multiple playlists
      formData.delete("playlist_ids"); // Clear native select if any
      selectedPlaylists.forEach(id => formData.append("playlist_ids", String(id)));

      const { saveBlogAction } = await import("@/app/blogs/actions");
      const result = await saveBlogAction(isEdit, initial?.slug, formData);

      addMessage(isEdit ? "Blog post updated successfully!" : "Blog post published successfully!", "success");
      router.push(urls.blogDetail(result.slug));
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save blog post. Please check your inputs.");
    } finally {
      setIsPending(false);
    }
  };

  const onExcalidrawSave = (scene: ExcalidrawSceneData) => {
    if (excalidrawIndex === null) return;
    patchSection(excalidrawIndex, {
      elements: scene.elements,
      appState: scene.appState,
      svgData: scene.svgData,
    });
    setExcalidrawIndex(null);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {isEdit ? "Edit blog post" : "Write a new post"}
        </h1>
        <label className="inline-flex items-center gap-2 cursor-pointer bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
          Load JSON
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onJsonFile}
          />
        </label>
      </div>

      {jsonStatus && (
        <p
          className={`mb-4 text-sm rounded-lg px-4 py-2.5 ${jsonStatus.isError
              ? "text-red-600 bg-red-50 border border-red-100"
              : "text-emerald-700 bg-emerald-50 border border-emerald-100"
            }`}
        >
          {jsonStatus.text}
        </p>
      )}
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      <form method="post" encType="multipart/form-data" className="space-y-6" onSubmit={onSubmit} noValidate>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <h2 className="text-lg font-bold text-slate-900">Basic information</h2>

          <Input
            id="f-title"
            name="title"
            type="text"
            label="Title"
            isRequired
            placeholder="Enter blog title"
            value={title}
            onChange={onTitleChange}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Input
                id="f-slug"
                name="slug"
                type="text"
                label="Slug"
                hint="(auto)"
                placeholder="blog-slug-url"
                value={slug}
                onChange={(value) => {
                  setSlugTouched(true);
                  setSlug(value);
                }}
              />
            </div>
            <div>
              <Input
                id="f-category"
                name="category"
                type="text"
                label="Category"
                placeholder="e.g. Technology"
                value={category}
                onChange={setCategory}
              />
              <datalist id="cat-list">
                {categories.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <Input
              id="f-subtitle"
              name="subtitle"
              type="text"
              label="Subtitle"
              placeholder="A short subtitle"
              value={subtitle}
              onChange={setSubtitle}
            />
          </div>

          <div>
            <TextArea
              id="f-excerpt"
              name="excerpt"
              label="Excerpt"
              placeholder="Short description shown in listings"
              value={excerpt}
              onChange={setExcerpt}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="f-image">
                Featured image
              </label>
              <input id="f-image" type="file" name="image" accept="image/*" className="fld" />
              {initial?.image_name && (
                <p className="mt-1 text-xs text-slate-400">Current: {initial.image_name}</p>
              )}
            </div>
            <div>
              <InputTags
                label="Tags"
                placeholder="Django, AI, Tutorial"
                value={tags}
                onChange={setTags}
              />
              <input type="hidden" name="tags" value={tags.join(",")} />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <Toggle
              name="is_published"
              isSelected={isPublished}
              onChange={(checked) => setIsPublished(checked)}
              label="Published"
            />
            <Toggle
              name="featured"
              isSelected={featured}
              onChange={(checked) => setFeatured(checked)}
              label="Feature this blog"
            />
            {user?.has_linkedin_oauth && (
              <Toggle
                name="post_to_linkedin"
                isSelected={postToLinkedIn}
                isDisabled={alreadyPosted}
                onChange={(checked) => setPostToLinkedIn(checked)}
                label={alreadyPosted ? "Posted on LinkedIn" : "Post to LinkedIn"}
              />
            )}
          </div>

          {userPlaylists.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="f-playlists">
                Playlists
              </label>
              <select
                id="f-playlists"
                name="playlists"
                multiple
                className="fld"
                style={{ minHeight: "80px" }}
                value={selectedPlaylists.map(String)}
                onChange={(event) =>
                  setSelectedPlaylists(
                    Array.from(event.target.selectedOptions, (option) => Number(option.value)),
                  )
                }
              >
                {userPlaylists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <TextArea
            id="f-introduction"
            name="introduction"
            label="Introduction"
            placeholder="Write the opening for your blog..."
            value={introduction}
            onChange={setIntroduction}
          />
        </div>

        {/* Sections builder */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Content sections</h2>
            <div className="flex items-center gap-2.5">
              {sections.length > 0 && (
                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setSections((current) => current.map((s) => ({ ...s, isCollapsed: true })))
                    }
                    className="px-2.5 py-1 font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
                  >
                    Collapse all
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSections((current) => current.map((s) => ({ ...s, isCollapsed: false })))
                    }
                    className="px-2.5 py-1 font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
                  >
                    Expand all
                  </button>
                </div>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen((current) => !current);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 bg-brand-50 rounded-lg px-3 py-1.5"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5v14" />
                  </svg>{" "}
                  Add section
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                    {SECTION_TYPES.map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSections((current) => [...current, blankSection(type)]);
                          setMenuOpen(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section, index) => {
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index && draggedIndex !== index;

              return (
                <div
                  key={index}
                  draggable={canDragIndex === index}
                  onDragStart={(e) => {
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== index) {
                      reorderSections(draggedIndex, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setCanDragIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setCanDragIndex(null);
                  }}
                  className={cx(
                    "flex flex-col border rounded-xl transition-all duration-150",
                    section.isCollapsed ? "p-3.5 gap-0 bg-white" : "p-5 gap-4 bg-slate-50/50",
                    isDragging
                      ? "opacity-40 border-dashed border-brand-400 bg-brand-50/20 scale-[0.99]"
                      : isDragOver
                      ? "border-brand-500 ring-2 ring-brand-400 bg-brand-50/40 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => patchSection(index, { isCollapsed: !section.isCollapsed })}
                        className="p-1 rounded-md hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                        title={section.isCollapsed ? "Expand section" : "Collapse section"}
                        aria-label={section.isCollapsed ? "Expand section" : "Collapse section"}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={cx("transition-transform duration-200", !section.isCollapsed && "rotate-90")}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>

                      <div
                        onMouseDown={() => setCanDragIndex(index)}
                        onMouseUp={() => setCanDragIndex(null)}
                        onTouchStart={() => setCanDragIndex(index)}
                        onTouchEnd={() => setCanDragIndex(null)}
                        className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none px-2 py-1 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors group shrink-0"
                        title="Drag to reorder section"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-slate-400 group-hover:text-slate-700">
                          <circle cx="5" cy="3" r="1.5" />
                          <circle cx="11" cy="3" r="1.5" />
                          <circle cx="5" cy="8" r="1.5" />
                          <circle cx="11" cy="8" r="1.5" />
                          <circle cx="5" cy="13" r="1.5" />
                          <circle cx="11" cy="13" r="1.5" />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-wide text-brand-600">
                          {typeLabel(section.type)}
                        </span>
                      </div>

                      {section.isCollapsed ? (
                        <span
                          onClick={() => patchSection(index, { isCollapsed: false })}
                          className="text-sm font-semibold text-slate-700 truncate cursor-pointer hover:text-brand-600 transition-colors ml-1"
                          title="Click to expand"
                        >
                          {section.title || (section.content ? section.content.slice(0, 60) + "..." : "(Untitled section)")}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                          (Drag to reorder)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => patchSection(index, { isCollapsed: !section.isCollapsed })}
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition-colors"
                      >
                        {section.isCollapsed ? "Expand" : "Collapse"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSections((current) => current.filter((_, position) => position !== index))}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {!section.isCollapsed && (
                    <>
                      <Field
                        field="title"
                        placeholder="Section title"
                        value={section.title ?? ""}
                        onChange={(value) => patchSection(index, { title: value })}
                      />

                      <SectionFields
                        section={section}
                        onPatch={(patch) => patchSection(index, patch)}
                        onOpenExcalidraw={() => setExcalidrawIndex(index)}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {sections.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              No sections yet. Add one, or load a JSON file.
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <TextArea
            id="f-conclusion"
            name="conclusion"
            label="Conclusion"
            placeholder="Wrap up your blog..."
            value={conclusion}
            onChange={setConclusion}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : (isEdit ? "Save changes" : "Publish post")}
          </button>
          <Link href={urls.blogList()} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Cancel
          </Link>
        </div>
      </form>

      {excalidrawIndex !== null && (
        <ExcalidrawModal
          initialElements={sections[excalidrawIndex]?.elements ?? []}
          initialAppState={sections[excalidrawIndex]?.appState ?? {}}
          onCancel={() => setExcalidrawIndex(null)}
          onSave={onExcalidrawSave}
        />
      )}
    </>
  );
}

/** The per-type body of one section card (`bodyFor()` in the original script). */
function SectionFields({
  section,
  onPatch,
  onOpenExcalidraw,
}: {
  section: EditorSection;
  onPatch: (patch: Partial<EditorSection>) => void;
  onOpenExcalidraw: () => void;
}) {
  switch (section.type) {
    case "text":
    case "note":
      return (
        <Field
          field="content"
          placeholder="Write your content..."
          multiline
          value={section.content ?? ""}
          onChange={(value) => onPatch({ content: value })}
        />
      );

    case "code":
      return (
        <>
          <Field
            field="language"
            placeholder="Language (e.g. python)"
            value={section.language ?? ""}
            onChange={(value) => onPatch({ language: value })}
          />
          <Field
            field="content"
            placeholder="Paste code..."
            multiline
            isCode
            value={section.content ?? ""}
            onChange={(value) => onPatch({ content: value })}
          />
        </>
      );

    case "bullets":
      return (
        <Field
          field="items"
          placeholder="One bullet per line"
          multiline
          value={(section.items ?? []).join("\n")}
          onChange={(value) =>
            onPatch({ items: value.split("\n").map((line) => line.trim()).filter(Boolean) })
          }
        />
      );

    case "table":
      return (
        <>
          <Field
            field="headers"
            placeholder="Headers, comma separated"
            value={(section.headers ?? []).join(", ")}
            onChange={(value) => onPatch({ headers: value.split(",").map((cell) => cell.trim()) })}
          />
          <Field
            field="rows"
            placeholder="One row per line, cells split by |"
            multiline
            value={(section.rows ?? []).map((row) => row.join(" | ")).join("\n")}
            onChange={(value) =>
              onPatch({
                rows: value
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line) => line.split("|").map((cell) => cell.trim())),
              })
            }
          />
        </>
      );

    case "youtube":
      return (
        <>
          <Field
            field="videoId"
            placeholder="YouTube video ID"
            value={section.videoId ?? ""}
            onChange={(value) => onPatch({ videoId: value })}
          />
          <Field
            field="videoTitle"
            placeholder="Video title"
            value={section.videoTitle ?? ""}
            onChange={(value) => onPatch({ videoTitle: value })}
          />
          <Field
            field="description"
            placeholder="Description"
            value={section.description ?? ""}
            onChange={(value) => onPatch({ description: value })}
          />
        </>
      );

    case "links":
      return (
        <Field
          field="links"
          placeholder="One per line: text | url | description"
          multiline
          value={(section.links ?? [])
            .map((link) => [link.text ?? "", link.url ?? "", link.description ?? ""].join(" | "))
            .join("\n")}
          onChange={(value) =>
            onPatch({
              links: value
                .split("\n")
                .filter((line) => line.trim())
                .map((line) => {
                  const parts = line.split("|");
                  return {
                    text: (parts[0] ?? "").trim(),
                    url: (parts[1] ?? "").trim(),
                    description: (parts[2] ?? "").trim(),
                  };
                }),
            })
          }
        />
      );

    case "image":
      return (
        <>
          <Field
            field="imageUrl"
            placeholder="Image URL"
            value={section.imageUrl ?? ""}
            onChange={(value) => onPatch({ imageUrl: value })}
          />
          <Field
            field="description"
            placeholder="Caption / description"
            value={section.description ?? ""}
            onChange={(value) => onPatch({ description: value })}
          />
        </>
      );

    case "flowchart":
      return (
        <Field
          field="steps"
          placeholder="Steps as JSON"
          multiline
          isCode
          value={JSON.stringify(section.steps ?? [], null, 2)}
          onChange={(value) => {
            try {
              onPatch({ steps: JSON.parse(value || "[]") });
            } catch {
              // Keep the last valid value while the JSON is mid-edit, as the original did.
            }
          }}
        />
      );

    case "excalidraw": {
      const hasSvg = Boolean(section.svgData && section.svgData.trim());
      return (
        <>
          {hasSvg ? (
            <div className="my-3 p-3 bg-white border border-slate-200 rounded-xl max-h-[300px] overflow-hidden flex items-center justify-center excalidraw-svg-wrapper">
              <RawSvg html={section.svgData ?? ""} />
            </div>
          ) : (
            <div className="my-3 p-6 bg-slate-100 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 text-xs">
              No diagram created yet. Click button below to draw.
            </div>
          )}
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={onOpenExcalidraw}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              ✏️ {hasSvg ? "Edit Excalidraw Diagram" : "Open Excalidraw Studio"}
            </button>
          </div>
          <Field
            field="caption"
            placeholder="Diagram caption (optional)"
            value={section.caption ?? section.description ?? ""}
            onChange={(value) => onPatch({ caption: value, description: value })}
          />
        </>
      );
    }

    default:
      return null;
  }
}
