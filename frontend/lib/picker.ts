import { formatDate } from "@/lib/format";
import type { Blog } from "@/lib/types";
import type { PlaylistPickerBlog } from "@/components/playlist-form";

/** Trims a `Blog` down to the fields the playlist picker sends to the browser. */
export function toPickerBlog(blog: Blog): PlaylistPickerBlog {
  return {
    id: blog.id,
    title: blog.title,
    image: blog.image,
    avatar_svg: blog.avatar_svg,
    category_name: blog.category?.name ?? null,
    created_at_label: formatDate(blog.created_at, "M d, Y"),
    author_username: blog.author.username,
  };
}
