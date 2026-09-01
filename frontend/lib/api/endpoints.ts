/**
 * Every path the frontend calls, relative to the API root.
 *
 * Keeping them in one table means a DRF router that names things differently
 * is a single edit here rather than a hunt through the resource modules.
 */
export const endpoints = {
  // --- auth (rest_framework_simplejwt) ---
  token: () => "/token/",
  tokenRefresh: () => "/token/refresh/",
  register: () => "/auth/register/",
  currentUser: () => "/users/me/",

  // --- content ---
  categories: () => "/categories/",
  blogs: () => "/blogs/",
  blog: (slug: string) => `/blogs/${slug}/`,
  blogLike: (slug: string) => `/blogs/${slug}/like/`,
  blogSave: (slug: string) => `/blogs/${slug}/save/`,
  blogShareLinkedIn: (slug: string) => `/blogs/${slug}/share-linkedin/`,

  playlists: () => "/playlists/",
  playlist: (slug: string) => `/playlists/${slug}/`,

  users: () => "/users/",
  user: (username: string) => `/users/${username}/`,
  userBlogs: (username: string) => `/users/${username}/blogs/`,
  userPlaylists: (username: string) => `/users/${username}/playlists/`,
  savedBlogs: () => "/users/me/saved-blogs/",

  search: () => "/search/",
  contact: () => "/contact/",
} as const;
