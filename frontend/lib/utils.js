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

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
  const serverUrl = baseUrl.replace(/\/api\/?$/, '');
  const cleanPath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;

  // If it's a local upload via Next.js public directory, return it directly so the frontend serves it
  if (cleanPath.startsWith('/uploads/')) {
    return cleanPath;
  }

  // Handle GCS paths that were saved as public_id (e.g. blogermenia/...)
  if (cleanPath.startsWith('/blogermenia/')) {
    if (process.env.NODE_ENV === 'development') {
      return `/uploads${cleanPath}`;
    } else {
      const bucket = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'learning_by_jay';
      return `https://storage.googleapis.com/${bucket}${cleanPath}`;
    }
  }

  // If the path doesn't already contain /media/ and isn't an absolute URL, prepend /media/
  if (!cleanPath.startsWith('/media/') && !cleanPath.includes('://')) {
    return `${serverUrl}/media${cleanPath}`;
  }

  return `${serverUrl}${cleanPath}`;
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
