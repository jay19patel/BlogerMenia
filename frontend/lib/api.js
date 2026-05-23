// API base URL - Internal Next.js API Routes
const API_BASE_URL = '/api';

// Helper function to compress images client-side before upload to prevent Vercel payload limits
async function compressImage(file) {
  if (typeof window === 'undefined' || !file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // Skip compression for GIFs to preserve animation
  if (file.type === 'image/gif') {
    return file;
  }

  try {
    // Dynamic import to prevent SSR/Next.js pre-rendering issues during build
    const imageCompression = (await import('browser-image-compression')).default;

    const options = {
      maxSizeMB: 0.4,          // Target file size under 500KB (400KB limit is perfect!)
      maxWidthOrHeight: 720,    // Optimized HD resolution for blogs, playlists, and profiles
      useWebWorker: true,      // Compress in a separate background thread so UI doesn't stutter!
      fileType: file.type || 'image/jpeg'
    };

    const compressedBlob = await imageCompression(file, options);
    // Convert the compressed Blob back to a File object with its original name and metadata
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Image compression failed, uploading original file instead:", error);
    return file;
  }
}

// Helper function to handle API responses
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP error! status: ${response.status}`
    }));

    let detailMessage;
    if (Array.isArray(errorData.detail)) {
      detailMessage = errorData.detail.map(e => `${e.loc?.join('.')} — ${e.msg}`).join('; ');
    } else if (typeof errorData.detail === 'object' && errorData.detail !== null) {
      detailMessage = JSON.stringify(errorData.detail);
    } else {
      detailMessage = errorData.detail || errorData.error || `HTTP error! status: ${response.status}`;
    }

    const error = new Error(detailMessage);
    error.status = response.status;
    error.response = { status: response.status, data: errorData };
    throw error;
  }
  
  if (response.status === 204) return { success: true };
  return response.json();
}

// Helper function to get headers
function getHeaders(token = null) {
  return {
    'Content-Type': 'application/json',
  };
}

export const api = {
  async getCurrentUser(token) {
    const response = await fetch(`/api/auth/session`, { method: 'GET' });
    return handleResponse(response);
  },

  async updateUserProfile(token, updateData) {
    const headers = getHeaders();
    let body = JSON.stringify(updateData);

    if (updateData instanceof FormData) {
      delete headers['Content-Type'];
      body = updateData;
    }

    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PATCH', 
      headers: headers,
      body: body,
    });
    return handleResponse(response);
  },

  async getUserById(userId) {
    const response = await fetch(`${API_BASE_URL}/user/${userId}`, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getUserProfileByEmail(email) {
    const response = await fetch(`${API_BASE_URL}/user/profile/${encodeURIComponent(email)}`, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getAllUsers(token) {
    const response = await fetch(`${API_BASE_URL}/user/all`, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async activateUser(token, userId) {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/activate`, { method: 'PUT', headers: getHeaders() });
    return handleResponse(response);
  },

  async deactivateUser(token, userId) {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/deactivate`, { method: 'PUT', headers: getHeaders() });
    return handleResponse(response);
  },

  async getAllCreators(searchQuery = null, skip = 0, limit = 10) {
    let url = `${API_BASE_URL}/user/all?skip=${skip}&limit=${limit}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(url, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getBlogs(searchQuery = null, skip = 0, limit = 10, filter = null, authorId = null) {
    let url = `${API_BASE_URL}/blogs?skip=${skip}&limit=${limit}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (filter && filter !== "All") url += `&category=${encodeURIComponent(filter)}`;
    if (authorId) url += `&authorId=${encodeURIComponent(authorId)}`;
    const response = await fetch(url, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getFeaturedBlogs() {
    const response = await fetch(`${API_BASE_URL}/blogs?sort=-views&limit=6`);
    const data = await handleResponse(response);
    return data.blogs || data.results || data;
  },

  async getMyBlogs(token, userId, searchQuery = null, skip = 0, limit = 10, filter = null) {
    let url = `${API_BASE_URL}/blogs?authorId=${encodeURIComponent(userId)}&skip=${skip}&limit=${limit}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (filter && filter !== "All") url += `&category=${encodeURIComponent(filter)}`;
    const response = await fetch(url, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getBlogBySlug(slug, token = null, trackView = true) {
    let url = `${API_BASE_URL}/blogs/${slug}`;
    if (!trackView) url += '?track_view=false';
    const response = await fetch(url, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async createBlog(blogData, token) {
    const response = await fetch(`${API_BASE_URL}/blogs`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(blogData) });
    return handleResponse(response);
  },

  async updateBlog(slug, blogData, token) {
    const response = await fetch(`${API_BASE_URL}/blogs/${slug}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(blogData) });
    return handleResponse(response);
  },

  async deleteBlog(token, slugOrId) {
    const response = await fetch(`${API_BASE_URL}/blogs/${slugOrId}`, { method: 'DELETE', headers: getHeaders() });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return { success: true };
  },

  async likeBlog(blogId, token) {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/like`, { method: 'POST', headers: getHeaders() });
    return handleResponse(response);
  },

  async toggleFeaturedBlog(token, blogId, newStatus) {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ featured: newStatus }) });
    return handleResponse(response);
  },

  async getSuggestedBlogs(limit = 3, excludeSlug = null) {
    let url = `${API_BASE_URL}/blogs?limit=${limit}`;
    if (excludeSlug) url += `&excludeSlug=${encodeURIComponent(excludeSlug)}`;
    const response = await fetch(url, { headers: getHeaders() });
    const data = await handleResponse(response);
    return data.blogs || data.results || data;
  },

  async getRandomRelatedBlogs(limit = 5, excludeSlug = null) {
    let url = `${API_BASE_URL}/blogs?limit=${limit}`;
    if (excludeSlug) url += `&excludeSlug=${encodeURIComponent(excludeSlug)}`;
    const response = await fetch(url, { headers: getHeaders() });
    const data = await handleResponse(response);
    return data.blogs || data.results || data;
  },

  async getBlogCategories(username = null) {
    let url = `${API_BASE_URL}/blogs/categories`;
    if (username) url += `?username=${encodeURIComponent(username)}`;
    const response = await fetch(url, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/blogs/stats`, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getPublicPlaylists() {
    const response = await fetch(`${API_BASE_URL}/playlists?is_public=true`, { method: 'GET', headers: getHeaders() });
    const data = await handleResponse(response);
    return data.playlists || data.results || data || [];
  },

  async getPlaylists(searchQuery = null, skip = 0, limit = 10, ownerId = null) {
    let url = `${API_BASE_URL}/playlists?is_public=true&skip=${skip}&limit=${limit}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (ownerId) url += `&ownerId=${encodeURIComponent(ownerId)}`;
    const response = await fetch(url, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getPopularPlaylists() {
    const response = await fetch(`${API_BASE_URL}/playlists?is_public=true&limit=6&sort=-views`, { method: 'GET', headers: getHeaders() });
    const data = await handleResponse(response);
    return data.playlists || data.results || data || [];
  },

  async getTopAuthors() {
    const response = await fetch(`${API_BASE_URL}/user/top-authors`, { method: 'GET', headers: getHeaders() });
    const data = await handleResponse(response);
    return data.users || data.results || data || [];
  },

  async contactUs(data) {
    const response = await fetch(`${API_BASE_URL}/content/contact`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(response);
  },

  async getTestimonials() {
    try {
      const response = await fetch(`${API_BASE_URL}/testimonials`, { method: 'GET', headers: getHeaders() });
      const data = await handleResponse(response);
      return { testimonials: data.testimonials || data.results || [] };
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      return { testimonials: [] };
    }
  },

  async getFAQs() {
    try {
      const response = await fetch(`${API_BASE_URL}/faqs`, { method: 'GET', headers: getHeaders() });
      const data = await handleResponse(response);
      return { faqs: data.faqs || data.results || [] };
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      return { faqs: [] };
    }
  },

  async submitTestimonial(token, data) {
    const response = await fetch(`${API_BASE_URL}/testimonials`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(response);
  },

  async generateBlog(userMessage, sessionId = null) {
    const response = await fetch(`${API_BASE_URL}/chat/generate`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ message: userMessage, session_id: sessionId }) });
    return handleResponse(response);
  },

  async getSessionState(sessionId) {
    const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}`, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async saveGeneratedBlog(sessionId, token) {
    const response = await fetch(`${API_BASE_URL}/chat/save`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ session_id: sessionId }) });
    return handleResponse(response);
  },

  async deleteSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(response);
  },

  async createPlaylist(playlistData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(playlistData) });
    return handleResponse(response);
  },

  async getMyPlaylists(token, userId) {
    const response = await fetch(`${API_BASE_URL}/playlists?ownerId=${userId}`, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getUserPlaylistsByEmail(email, userId, token = null, isOwner = false, skip = 0, limit = 10) {
    let url = `${API_BASE_URL}/playlists?ownerId=${userId}&skip=${skip}&limit=${limit}`;
    if (!isOwner) url += '&is_public=true';
    const response = await fetch(url, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getPlaylist(playlistId, token = null) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async updatePlaylist(playlistId, playlistData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(playlistData) });
    return handleResponse(response);
  },

  async deletePlaylist(playlistIdOrSlug, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistIdOrSlug}`, { method: 'DELETE', headers: getHeaders() });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return { success: true };
  },

  async addBlogToPlaylist(playlistIdOrSlug, blogData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistIdOrSlug}/blogs`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(blogData) });
    return handleResponse(response);
  },

  async removeBlogFromPlaylist(playlistIdOrSlug, blogId, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistIdOrSlug}/blogs/${blogId}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(response);
  },

  async getBlogPlaylists(blogId, token) {
    const response = await fetch(`${API_BASE_URL}/playlists?blogId=${blogId}`, { method: 'GET', headers: getHeaders() });
    return handleResponse(response);
  },

  async getCategories(token = null) {
    const res = await fetch(`${API_BASE_URL}/blogs/categories?limit=100`, { method: 'GET', headers: getHeaders() });
    const data = await handleResponse(res);
    return data.categories || data.results || data.items || data || [];
  },

  async getOrCreateCategory(name, token) {
    if (!name || !name.trim()) return null;
    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');
    const findExisting = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/blogs/categories?limit=200`);
        const data = await res.json();
        const all = data.categories || data.results || data.items || (Array.isArray(data) ? data : []);
        return all.find(c => c.name.toLowerCase() === trimmedName.toLowerCase()) || null;
      } catch { return null; }
    };
    const existing = await findExisting();
    if (existing) return existing._id || existing.id;
    try {
      const createRes = await fetch(`${API_BASE_URL}/blogs/categories`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name: trimmedName, slug }) });
      if (createRes.ok) {
        const created = await createRes.json();
        return created._id || created.id;
      }
      const retry = await findExisting();
      if (retry) return retry._id || retry.id;
      return null;
    } catch (e) {
      const retry = await findExisting();
      return retry?._id || retry?.id || null;
    }
  },

  async uploadImage(file = null, collectionName = 'blogs', token = null, url = null) {
    const formData = new FormData();
    if (file) {
      const compressedFile = await compressImage(file);
      formData.append('file', compressedFile);
    }
    if (url) formData.append('url', url);
    if (collectionName) formData.append('folder', collectionName);
    const response = await fetch(`${API_BASE_URL}/media/upload`, { method: 'POST', body: formData });
    return handleResponse(response);
  }
};
