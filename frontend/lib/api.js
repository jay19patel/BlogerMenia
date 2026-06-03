// ─────────────────────────────────────────────────────────────────────────────
//  API client
//  - Blog / category / stats / AI-chat  → FastAPI (port 8000)
//  - Auth / user / media / playlists    → Next.js API routes (same origin)
// ─────────────────────────────────────────────────────────────────────────────

const NEXT_API = '/api';

function getFastApiBase() {
  const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const clean = configured.replace(/\/+$/, '');

  if (typeof window === 'undefined') return clean;

  try {
    const url = new URL(clean);
    if (url.hostname === 'backend' || url.hostname === '0.0.0.0') {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
}

const FASTAPI_BASE = getFastApiBase();

const BLOG_API = `${FASTAPI_BASE}/api/v1/blogs`;
const PLAYLIST_API = `${FASTAPI_BASE}/api/v1/playlists`;

// ── Backend JWT token cache ───────────────────────────────────────────────────
// The frontend fetches a short-lived HS256 JWT from /api/auth/backend-token
// (a Next.js route that reads the NextAuth session). This token is sent as
// Authorization: Bearer to FastAPI for protected blog endpoints.

let _cachedToken = null;
let _tokenExpiry = 0;

async function getBackendToken() {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry) return _cachedToken;

  const res = await fetch(`${NEXT_API}/auth/backend-token`, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Could not create backend auth token. Please log in again.');
  }
  const data = await res.json();
  _cachedToken = data.access_token;
  // Expire 5 minutes before the token actually expires (1hr - 5min = 55min)
  _tokenExpiry = now + (data.expires_in - 300) * 1000;
  return _cachedToken;
}

function clearBackendToken() {
  _cachedToken = null;
  _tokenExpiry = 0;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function compressImage(file) {
  if (typeof window === 'undefined' || !file?.type?.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file;
  try {
    const imageCompression = (await import('browser-image-compression')).default;
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 720,
      useWebWorker: true,
      fileType: file.type || 'image/jpeg',
    });
    return new File([compressed], file.name, { type: compressed.type || file.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP error! status: ${response.status}`,
    }));
    let detail;
    if (Array.isArray(errorData.detail)) {
      detail = errorData.detail.map(e => `${e.loc?.join('.')} — ${e.msg}`).join('; ');
    } else if (typeof errorData.detail === 'object' && errorData.detail !== null) {
      detail = JSON.stringify(errorData.detail);
    } else {
      detail = errorData.detail || errorData.error || `HTTP error! status: ${response.status}`;
    }
    const err = new Error(detail);
    err.status = response.status;
    err.response = { status: response.status, data: errorData };
    throw err;
  }
  if (response.status === 204) return { success: true };
  return response.json();
}

function fetchErrorMessage(error, url) {
  if (error instanceof TypeError) {
    return `Could not reach FastAPI at ${url}. Make sure backend is running on ${FASTAPI_BASE}.`;
  }
  return error.message || 'Request failed';
}

function jsonHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function authHeaders() {
  const token = await getBackendToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const api = {
  // ── Auth / Session (Next.js) ─────────────────────────────────────────────
  async getCurrentUser() {
    const res = await fetch(`${NEXT_API}/auth/session`, { method: 'GET' });
    return handleResponse(res);
  },

  // ── User (Next.js) ───────────────────────────────────────────────────────
  async updateUserProfile(token, updateData) {
    const headers = jsonHeaders();
    let body = JSON.stringify(updateData);
    if (updateData instanceof FormData) {
      delete headers['Content-Type'];
      body = updateData;
    }
    const res = await fetch(`${NEXT_API}/user/profile`, { method: 'PATCH', headers, body });
    return handleResponse(res);
  },

  async getUserById(userId) {
    const res = await fetch(`${NEXT_API}/user/${userId}`, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getUserProfileByEmail(email) {
    const res = await fetch(`${NEXT_API}/user/profile/${encodeURIComponent(email)}`, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getAllUsers() {
    const res = await fetch(`${NEXT_API}/user/all`, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async activateUser(token, userId) {
    const res = await fetch(`${NEXT_API}/user/${userId}/activate`, { method: 'PUT', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async deactivateUser(token, userId) {
    const res = await fetch(`${NEXT_API}/user/${userId}/deactivate`, { method: 'PUT', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getAllCreators(searchQuery = null, skip = 0, limit = 10) {
    let url = `${NEXT_API}/user/all?skip=${skip}&limit=${limit}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getTopAuthors() {
    const res = await fetch(`${NEXT_API}/user/top-authors`, { method: 'GET', headers: jsonHeaders() });
    const data = await handleResponse(res);
    return data.users || data.results || data || [];
  },

  // ── Blogs → FastAPI ───────────────────────────────────────────────────────

  async getBlogs(searchQuery = null, skip = 0, limit = 10, filter = null, authorId = null) {
    let url = `${BLOG_API}/?skip=${skip}&limit=${limit}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (filter && filter !== 'All') url += `&category=${encodeURIComponent(filter)}`;
    if (authorId) url += `&authorId=${encodeURIComponent(authorId)}`;
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getFeaturedBlogs() {
    const res = await fetch(`${BLOG_API}/?sort=-views&limit=6`);
    const data = await handleResponse(res);
    return data.blogs || data.results || data;
  },

  async getMyBlogs(token, userId, searchQuery = null, skip = 0, limit = 10, filter = null) {
    let url = `${BLOG_API}/?authorId=${encodeURIComponent(userId)}&skip=${skip}&limit=${limit}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (filter && filter !== 'All') url += `&category=${encodeURIComponent(filter)}`;
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getBlogBySlug(slug, token = null, trackView = true) {
    let url = `${BLOG_API}/${slug}/`;
    if (!trackView) url += '?track_view=false';
    const res = await fetch(url, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async createBlog(blogData) {
    const headers = await authHeaders();
    const res = await fetch(`${BLOG_API}/`, { method: 'POST', headers, body: JSON.stringify(blogData) });
    return handleResponse(res);
  },

  async updateBlog(slug, blogData) {
    const headers = await authHeaders();
    const res = await fetch(`${BLOG_API}/${slug}/`, { method: 'PATCH', headers, body: JSON.stringify(blogData) });
    return handleResponse(res);
  },

  async deleteBlog(token, slugOrId) {
    const headers = await authHeaders();
    const res = await fetch(`${BLOG_API}/${slugOrId}/`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return { success: true };
  },

  async likeBlog(blogId) {
    const headers = await authHeaders();
    const res = await fetch(`${BLOG_API}/${blogId}/like/`, { method: 'POST', headers });
    return handleResponse(res);
  },

  // ── Interactions (likes + bookmarks, user-scoped) ─────────────────────────

  async getBlogInteraction(slug) {
    // Returns { has_liked, bookmark|null } for the current user. Requires auth.
    const headers = await authHeaders();
    const res = await fetch(`${BLOG_API}/${slug}/interaction/`, { headers });
    return handleResponse(res);
  },

  async saveBookmark(slug, sectionId, sectionTitle = null) {
    const headers = await authHeaders();
    const res = await fetch(`${BLOG_API}/${slug}/bookmark/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ section_id: sectionId, section_title: sectionTitle }),
    });
    return handleResponse(res);
  },

  async deleteBookmark(slug) {
    const headers = await authHeaders();
    const res = await fetch(`${BLOG_API}/${slug}/bookmark/`, { method: 'DELETE', headers });
    if (!res.ok && res.status !== 204) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return { success: true };
  },

  async getMyBookmarks(limit = 20) {
    const headers = await authHeaders();
    const res = await fetch(`${FASTAPI_BASE}/api/v1/users/me/bookmarks/?limit=${limit}`, { headers });
    return handleResponse(res);
  },

  async getMyLikedBlogIds(limit = 100) {
    const headers = await authHeaders();
    const res = await fetch(`${FASTAPI_BASE}/api/v1/users/me/likes/?limit=${limit}`, { headers });
    const data = await handleResponse(res);
    return data.blog_ids || [];
  },

  async toggleFeaturedBlog(token, blogId, newStatus) {
    const headers = await authHeaders();
    const res = await fetch(`${BLOG_API}/${blogId}/`, { method: 'PATCH', headers, body: JSON.stringify({ featured: newStatus }) });
    return handleResponse(res);
  },

  async getSuggestedBlogs(limit = 3, excludeSlug = null) {
    // Prefer the semantic-similar endpoint when we know which blog we're
    // suggesting around. Falls back to a recency list if related/ 404s
    // (e.g. for a freshly-created blog before its embedding lands).
    if (excludeSlug) {
      try {
        const res = await fetch(`${BLOG_API}/${encodeURIComponent(excludeSlug)}/related/?limit=${limit}`, {
          headers: jsonHeaders(),
        });
        if (res.ok) {
          const data = await handleResponse(res);
          if (Array.isArray(data) && data.length > 0) return data;
        }
      } catch (e) {
        // fall through to recency
      }
    }
    let url = `${BLOG_API}/?limit=${limit}`;
    if (excludeSlug) url += `&excludeSlug=${encodeURIComponent(excludeSlug)}`;
    const res = await fetch(url, { headers: jsonHeaders() });
    const data = await handleResponse(res);
    return data.blogs || data.results || data;
  },

  async getRandomRelatedBlogs(limit = 5, excludeSlug = null) {
    let url = `${BLOG_API}/?limit=${limit}`;
    if (excludeSlug) url += `&excludeSlug=${encodeURIComponent(excludeSlug)}`;
    const res = await fetch(url, { headers: jsonHeaders() });
    const data = await handleResponse(res);
    return data.blogs || data.results || data;
  },

  // ── Categories → FastAPI ──────────────────────────────────────────────────

  async getBlogCategories(username = null) {
    let url = `${BLOG_API}/categories/`;
    if (username) url += `?username=${encodeURIComponent(username)}`;
    try {
      const res = await fetch(url, { method: 'GET', headers: jsonHeaders() });
      const data = await handleResponse(res);
      return Array.isArray(data) ? { categories: data } : data;
    } catch (error) {
      throw new Error(fetchErrorMessage(error, url));
    }
  },

  async getCategories() {
    const res = await fetch(`${BLOG_API}/categories/?limit=100`, { method: 'GET', headers: jsonHeaders() });
    const data = await handleResponse(res);
    return data.categories || data.results || data.items || data || [];
  },

  async getOrCreateCategory(name) {
    if (!name?.trim()) return null;
    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase()
      .replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

    // Check existing first
    try {
      const res = await fetch(`${BLOG_API}/categories/`);
      const data = await res.json();
      const all = Array.isArray(data) ? data : (data.items || data.results || []);
      const existing = all.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
      if (existing) return existing._id || existing.id;
    } catch { /* fallthrough to create */ }

    try {
      const createRes = await fetch(`${BLOG_API}/categories/`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ name: trimmedName, slug }),
      });
      const created = await handleResponse(createRes);
      return created._id || created.id;
    } catch (error) {
      throw new Error(fetchErrorMessage(error, `${BLOG_API}/categories/`));
    }
  },

  // ── Stats → FastAPI ───────────────────────────────────────────────────────

  async getStats() {
    const res = await fetch(`${BLOG_API}/stats/`, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  // ── AI Chat → FastAPI ─────────────────────────────────────────────────────

  async generateBlog(userMessage, sessionId = null) {
    const headers = await authHeaders();
    const res = await fetch(`${FASTAPI_BASE}/chat/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: userMessage, session_id: sessionId }),
    });
    return handleResponse(res);
  },

  async getSessionState(sessionId) {
    const res = await fetch(`${FASTAPI_BASE}/session/${sessionId}/`, { method: 'GET', headers: jsonHeaders() });
    return handleResponse(res);
  },

  async saveGeneratedBlog(sessionId) {
    // Push session blog state to FastAPI → then save via blog endpoint
    const headers = await authHeaders();
    const sessionRes = await fetch(`${FASTAPI_BASE}/session/${sessionId}/`, { headers: jsonHeaders() });
    if (!sessionRes.ok) throw new Error('Session not found');
    const { blog_state } = await sessionRes.json();
    if (!blog_state) throw new Error('No blog in session to save');
    return api.createBlog(blog_state);
  },

  async deleteSession(sessionId) {
    const res = await fetch(`${FASTAPI_BASE}/session/${sessionId}/`, { method: 'DELETE', headers: jsonHeaders() });
    return handleResponse(res);
  },

  // ── Media (Next.js) ───────────────────────────────────────────────────────

  async uploadImage(file = null, collectionName = 'blogs', token = null, url = null) {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (url) formData.append('url', url);
    if (collectionName) formData.append('folder', collectionName);

    const headers = await authHeaders();
    // Strip application/json Content-Type so browser sets correct multipart/form-data boundary
    delete headers['Content-Type'];

    const res = await fetch(`${FASTAPI_BASE}/api/v1/media/upload/`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  // ── Playlists → FastAPI ───────────────────────────────────────────────────

  async getPublicPlaylists() {
    const res = await fetch(`${PLAYLIST_API}/?is_public=true`, { headers: jsonHeaders() });
    const data = await handleResponse(res);
    return data.playlists || data.results || data || [];
  },

  async getPlaylists(searchQuery = null, skip = 0, limit = 10, ownerId = null) {
    let url = `${PLAYLIST_API}/?is_public=true&skip=${skip}&limit=${limit}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (ownerId) url += `&ownerId=${encodeURIComponent(ownerId)}`;
    const res = await fetch(url, { headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getPopularPlaylists() {
    const res = await fetch(`${PLAYLIST_API}/?is_public=true&limit=6&sort=-views`, { headers: jsonHeaders() });
    const data = await handleResponse(res);
    return data.playlists || data.results || data || [];
  },

  async createPlaylist(playlistData) {
    const headers = await authHeaders();
    const res = await fetch(`${PLAYLIST_API}/`, { method: 'POST', headers, body: JSON.stringify(playlistData) });
    return handleResponse(res);
  },

  async getMyPlaylists(token, userId) {
    const res = await fetch(`${PLAYLIST_API}/?ownerId=${encodeURIComponent(userId)}`, { headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getUserPlaylistsByEmail(email, userId, token = null, isOwner = false, skip = 0, limit = 10) {
    let url = `${PLAYLIST_API}/?ownerId=${encodeURIComponent(userId)}&skip=${skip}&limit=${limit}`;
    if (!isOwner) url += '&is_public=true';
    const res = await fetch(url, { headers: jsonHeaders() });
    return handleResponse(res);
  },

  async getPlaylist(playlistId) {
    const res = await fetch(`${PLAYLIST_API}/${playlistId}/`, { headers: jsonHeaders() });
    return handleResponse(res);
  },

  async updatePlaylist(playlistId, playlistData) {
    const headers = await authHeaders();
    const res = await fetch(`${PLAYLIST_API}/${playlistId}/`, { method: 'PATCH', headers, body: JSON.stringify(playlistData) });
    return handleResponse(res);
  },

  async deletePlaylist(playlistIdOrSlug) {
    const headers = await authHeaders();
    const res = await fetch(`${PLAYLIST_API}/${playlistIdOrSlug}/`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return { success: true };
  },

  async addBlogToPlaylist(playlistIdOrSlug, blogData) {
    const headers = await authHeaders();
    const res = await fetch(`${PLAYLIST_API}/${playlistIdOrSlug}/blogs/`, { method: 'POST', headers, body: JSON.stringify(blogData) });
    return handleResponse(res);
  },

  async removeBlogFromPlaylist(playlistIdOrSlug, blogId) {
    const headers = await authHeaders();
    const res = await fetch(`${PLAYLIST_API}/${playlistIdOrSlug}/blogs/${blogId}/`, { method: 'DELETE', headers });
    return handleResponse(res);
  },

  async getBlogPlaylists(blogId) {
    const res = await fetch(`${PLAYLIST_API}/?blogId=${encodeURIComponent(blogId)}`, { headers: jsonHeaders() });
    return handleResponse(res);
  },

  // ── Content (Next.js) ─────────────────────────────────────────────────────

  async contactUs(data) {
    const res = await fetch(`${NEXT_API}/content/contact`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },

  async getTestimonials() {
    try {
      const res = await fetch(`${NEXT_API}/testimonials`, { headers: jsonHeaders() });
      const data = await handleResponse(res);
      return { testimonials: data.testimonials || data.results || [] };
    } catch {
      return { testimonials: [] };
    }
  },

  async getFAQs() {
    try {
      const res = await fetch(`${NEXT_API}/faqs`, { headers: jsonHeaders() });
      const data = await handleResponse(res);
      return { faqs: data.faqs || data.results || [] };
    } catch {
      return { faqs: [] };
    }
  },

  async submitTestimonial(token, data) {
    const res = await fetch(`${NEXT_API}/testimonials`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },

  // ── Token utils ───────────────────────────────────────────────────────────
  clearBackendToken,
};
