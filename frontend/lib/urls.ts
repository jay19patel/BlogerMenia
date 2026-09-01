/**
 * Every `{% url %}` name in the Django templates, mapped to its Next.js path.
 *
 * Paths keep the trailing slash Django uses (see `trailingSlash` in
 * `next.config.ts`) so links match the original app character for character.
 */
export const urls = {
  home: () => "/",
  contact: () => "/contact/",

  blogList: () => "/blogs/",
  blogListByCategory: (slug: string) => `/blogs/?category=${encodeURIComponent(slug)}`,
  blogListByTag: (tag: string) => `/blogs/?tag=${encodeURIComponent(tag)}`,
  blogCreate: () => "/blogs/create/",
  blogDetail: (slug: string) => `/blogs/${slug}/`,
  blogUpdate: (slug: string) => `/blogs/${slug}/update/`,
  blogDelete: (slug: string) => `/blogs/${slug}/delete/`,
  blogPdf: (slug: string) => `/blogs/${slug}/pdf/`,

  playlistList: () => "/playlists/",
  playlistCreate: () => "/playlists/create/",
  playlistDetail: (slug: string) => `/playlists/${slug}/`,
  playlistUpdate: (slug: string) => `/playlists/${slug}/update/`,
  playlistDelete: (slug: string) => `/playlists/${slug}/delete/`,

  search: (query?: string) => (query ? `/search/?q=${encodeURIComponent(query)}` : "/search/"),

  userList: () => "/accounts-list/",
  userProfile: (username: string) => `/profile/${username}/`,
  profileEdit: (username: string) => `/profile/${username}/edit/`,

  accountLogin: () => "/accounts/login/",
  accountSignup: () => "/accounts/signup/",
  accountLogout: () => "/accounts/logout/",
  accountInactive: () => "/accounts/inactive/",
  accountEmail: () => "/accounts/email/",
  accountChangePassword: () => "/accounts/password/change/",
  accountResetPassword: () => "/accounts/password/reset/",
  accountResetPasswordDone: () => "/accounts/password/reset/done/",
  accountResetPasswordFromKey: (key: string) => `/accounts/password/reset/key/${key}/`,
  accountResetPasswordFromKeyDone: () => "/accounts/password/reset/key/done/",
  accountEmailVerificationSent: () => "/accounts/confirm-email/",
  accountConfirmEmail: (key: string) => `/accounts/confirm-email/${key}/`,

  socialaccountConnections: () => "/accounts/social/connections/",
  socialaccountSignup: () => "/accounts/social/signup/",
  linkedinLogin: () => "/accounts/linkedin_oauth2/login/",
} as const;
