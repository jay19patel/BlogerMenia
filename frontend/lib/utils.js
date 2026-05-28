import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path) {
  if (!path) return null;

  let finalPath = path;
  // If path is an object (like an Attachment), extract a string path
  if (typeof path === 'object' && path !== null) {
    finalPath = path.file_path || path.url || path.thumbnail || path.id || null;
  }

  if (!finalPath || typeof finalPath !== 'string') return null;

  if (finalPath.startsWith('http://') || finalPath.startsWith('https://') || finalPath.startsWith('data:')) {
    return finalPath;
  }

  const cleanPath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;

  // If it's a local upload via Next.js public directory, return it directly
  if (cleanPath.startsWith('/uploads/')) {
    return cleanPath;
  }

  return cleanPath;
}

export function formatDate(dateString, fallback = "N/A") {
  if (!dateString) return fallback;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getBlogDate(blog) {
  return blog?.publishedDate || blog?.published_date || blog?.created_at || blog?.createdAt || blog?.added_at || blog?.date;
}
