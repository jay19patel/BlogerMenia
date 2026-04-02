// API base URL - can be overridden with environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Helper function to handle API responses
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP error! status: ${response.status}`
    }));

    // Properly serialize detail — it may be an array (Pydantic validation errors) or string
    let detailMessage;
    if (Array.isArray(errorData.detail)) {
      detailMessage = errorData.detail.map(e => `${e.loc?.join('.')} — ${e.msg}`).join('; ');
    } else if (typeof errorData.detail === 'object' && errorData.detail !== null) {
      detailMessage = JSON.stringify(errorData.detail);
    } else {
      detailMessage = errorData.detail || `HTTP error! status: ${response.status}`;
    }

    const error = new Error(detailMessage);
    error.status = response.status;
    error.response = { status: response.status, data: errorData };
    throw error;
  }
  return response.json();
}

// Helper function to get headers with optional token
function getHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// API object with all methods
// API object with all methods
export const api = {
  // Authentication endpoints
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  async register(data) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async logout(token) {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async googleLogin(code) {
    const response = await fetch(`${API_BASE_URL}/auth/google/login/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code: code }),
    });
    return handleResponse(response);
  },

  // User endpoints
  async getCurrentUser(token) {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async updateUserProfile(token, updateData) {
    const headers = getHeaders(token);
    let body = JSON.stringify(updateData);

    if (updateData instanceof FormData) {
      delete headers['Content-Type'];
      body = updateData;
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PATCH', // dj-rest-auth uses PATCH/PUT. PATCH is safer for partial updates.
      headers: headers,
      body: body,
    });
    return handleResponse(response);
  },

  async getUserById(userId) {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getUserProfileByEmail(email) {
    const response = await fetch(`${API_BASE_URL}/user/profile/${encodeURIComponent(email)}/`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Admin endpoints
  async getAllUsers(token) {
    const response = await fetch(`${API_BASE_URL}/admin/users/`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async activateUser(token, userId) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/activate/`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async deactivateUser(token, userId) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/deactivate/`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async getAllCreators(searchQuery = null, skip = 0, limit = 10) {
    let url = `${API_BASE_URL}/user/all/?skip=${skip}&limit=${limit}`;
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },


  // Blog endpoints
  async getBlogs(searchQuery = null, skip = 0, limit = 10, filter = null, authorId = null) {
    let url = `${API_BASE_URL}/blogs/?skip=${skip}&limit=${limit}`;

    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    // filter can be a category name, or null/"All" for no filter
    if (filter && filter !== "All") {
      url += `&category.name=${encodeURIComponent(filter)}`;
    }

    // Pass author.$id to filter correctly using generic CRUD
    if (authorId) {
      url += `&author.$id=${encodeURIComponent(authorId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse(response);

    // Adapt DRF standard pagination response to application format
    // DRF returns: { count: 10, next: "...", previous: "...", results: [...] }
    // Application expects: { total: 10, blogs: [...] }
    if (data.results) {
      return {
        total: data.total || data.count || 0,
        blogs: data.results,
        next: data.next,
        previous: data.previous
      };
    }

    // Fallback for unpaginated or already formatted response
    return data;
  },

  async getFeaturedBlogs() {
    // Return top 6 blogs sorted by views
    const response = await fetch(`${API_BASE_URL}/blogs/?sort=-views&limit=6`);
    const data = await handleResponse(response);
    return data.results || data;
  },

  // Get blogs for currently authenticated user (requires token)
  async getMyBlogs(token, userId, searchQuery = null, skip = 0, limit = 10, filter = null) {
    let url = `${API_BASE_URL}/blogs/?author.$id=${encodeURIComponent(userId)}&skip=${skip}&limit=${limit}`;

    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    // filter can be a category name, or null/"All" for no filter
    if (filter && filter !== "All") {
      url += `&category.name=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),  // CRITICAL: Requires authentication token
    });
    const data = await handleResponse(response);

    // Adapt DRF standard pagination response
    if (data.results) {
      return {
        total: data.total || data.count || 0,
        blogs: data.results,
        next: data.next,
        previous: data.previous
      };
    }
    return data;
  },



  async getBlogBySlug(slug, token = null, trackView = true) {
    let url = `${API_BASE_URL}/blogs/${slug}/`;
    if (!trackView) {
      url += '?track_view=false';
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async createBlog(blogData, token) {
    const response = await fetch(`${API_BASE_URL}/blogs/`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  async updateBlog(slug, blogData, token) {
    const response = await fetch(`${API_BASE_URL}/blogs/${slug}/`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  async deleteBlog(token, slugOrId) {
    const response = await fetch(`${API_BASE_URL}/blogs/${slugOrId}/`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    // DELETE returns 204 No Content typically
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true };
  },

  async likeBlog(blogId, token) {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/like/`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async toggleFeaturedBlog(token, blogId, newStatus) {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ featured: newStatus })
    });
    return handleResponse(response);
  },

  async getSuggestedBlogs(limit = 3, excludeSlug = null) {
    let url = `${API_BASE_URL}/blogs/?page=1&page_size=${limit}`;
    if (excludeSlug) {
      url += `&slug__ne=${encodeURIComponent(excludeSlug)}`;
    }
    const response = await fetch(url, { headers: getHeaders() });
    const data = await handleResponse(response);
    return data.results ? data.results : data;
  },

  async getRandomRelatedBlogs(limit = 5, excludeSlug = null) {
    let url = `${API_BASE_URL}/blogs/?page=1&page_size=${limit}`;
    if (excludeSlug) {
      url += `&slug__ne=${encodeURIComponent(excludeSlug)}`;
    }
    const response = await fetch(url, { headers: getHeaders() });
    const data = await handleResponse(response);
    return data.results ? data.results : data;
  },

  async getBlogCategories(username = null) {
    // If username provided, filter categories by that user
    // If not provided, get all categories (for main /blogs page)
    let url = `${API_BASE_URL}/blogs/categories/`;
    if (username) {
      url += `?username=${encodeURIComponent(username)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },


  async getStats() {
    const response = await fetch(`${API_BASE_URL}/blogs/stats/`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getPublicPlaylists() {
    const response = await fetch(`${API_BASE_URL}/playlists/?is_public=true`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse(response);
    return data && data.results ? data.results : (data || []);
  },

  async getPlaylists(searchQuery = null, skip = 0, limit = 10, ownerId = null) {
    const page = Math.floor(skip / limit) + 1;
    let url = `${API_BASE_URL}/playlists/?is_public=true&page=${page}&page_size=${limit}`;

    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    if (ownerId) {
      url += `&owner.$id=${encodeURIComponent(ownerId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse(response);

    if (data.results) {
      return {
        total: data.total || data.count || 0,
        playlists: data.results,
        next: data.next,
        previous: data.previous
      };
    }
    return data;
  },

  async getPopularPlaylists() {
    const response = await fetch(`${API_BASE_URL}/playlists/?is_public=true&limit=6&sort=%5B%28%22views%22%2C%20-1%29%5D`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse(response);
    return data && data.results ? data.results : (data || []);
  },

  async getTopAuthors() {
    const response = await fetch(`${API_BASE_URL}/user/top-authors/`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await handleResponse(response);
    return data && data.results ? data.results : (data || []);
  },

  async contactUs(data) {
    const response = await fetch(`${API_BASE_URL}/content/contact/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Real API Data for Testimonials
  async getTestimonials() {
    try {
      const response = await fetch(`${API_BASE_URL}/testimonials/`, {
        method: 'GET',
        headers: getHeaders(),
      });
      const data = await handleResponse(response);
      return {
        testimonials: data.results || []
      };
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      return { testimonials: [] };
    }
  },

  // Real API Data for FAQs
  async getFAQs() {
    try {
      const response = await fetch(`${API_BASE_URL}/faqs/`, {
        method: 'GET',
        headers: getHeaders(),
      });
      const data = await handleResponse(response);
      return {
        faqs: data.results || []
      };
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      return { faqs: [] };
    }
  },

  async submitTestimonial(token, data) {
    const response = await fetch(`${API_BASE_URL}/testimonials/`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },



  // Chat/Generation endpoints
  async generateBlog(userMessage, sessionId = null) {
    const response = await fetch(`${API_BASE_URL}/chat/generate/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        message: userMessage,
        session_id: sessionId
      }),
    });
    return handleResponse(response);
  },

  async getSessionState(sessionId) {
    const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}/`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async saveGeneratedBlog(sessionId, token) {
    const response = await fetch(`${API_BASE_URL}/chat/save/`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ session_id: sessionId }),
    });
    return handleResponse(response);
  },

  async deleteSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}/`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Playlist endpoints
  async createPlaylist(playlistData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(playlistData),
    });
    return handleResponse(response);
  },

  async getMyPlaylists(token, userId) {
    const response = await fetch(`${API_BASE_URL}/playlists/?owner.$id=${userId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    const data = await handleResponse(response);

    if (data.results) {
      return {
        total: data.count,
        playlists: data.results,
        next: data.next,
        previous: data.previous
      };
    }
    return { playlists: Array.isArray(data) ? data : [] }; // Fallback
  },

  async getUserPlaylistsByEmail(email, userId, token = null, isOwner = false, skip = 0, limit = 10) {
    const page = Math.floor(skip / limit) + 1;
    let url = `${API_BASE_URL}/playlists/?owner.$id=${userId}&page=${page}&page_size=${limit}`;
    if (!isOwner) {
      url += '&is_public=true';
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });
    const data = await handleResponse(response);

    if (data.results) {
      return {
        total: data.count,
        playlists: data.results,
        next: data.next,
        previous: data.previous
      };
    }
    return { playlists: Array.isArray(data) ? data : [] }; // Fallback
  },

  async getPlaylist(playlistId, token = null) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async updatePlaylist(playlistId, playlistData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(playlistData),
    });
    return handleResponse(response);
  },

  async deletePlaylist(playlistIdOrSlug, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistIdOrSlug}/`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    // DELETE returns 204 No Content, so don't try to parse JSON
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true };
  },

  async addBlogToPlaylist(playlistIdOrSlug, blogData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistIdOrSlug}/blogs/`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  async removeBlogFromPlaylist(playlistIdOrSlug, blogId, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistIdOrSlug}/blogs/${blogId}/`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },


  async getBlogPlaylists(blogId, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/?blogs.$id=${blogId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async getCategories(token = null) {
    const res = await fetch(`${API_BASE_URL}/blogs/categories/?limit=100`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    const data = await handleResponse(res);
    return data.results || data.items || data || [];
  },

  async getOrCreateCategory(name, token) {
    if (!name || !name.trim()) return null;

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Helper: load all categories and find name match
    const findExisting = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/blogs/categories/?limit=200`, {
          method: 'GET',
          headers: getHeaders(token),
        });
        const data = await res.json();
        const all = data.results || data.items || (Array.isArray(data) ? data : []);
        return all.find(c => c.name.toLowerCase() === trimmedName.toLowerCase()) || null;
      } catch { return null; }
    };

    // 1. Try to find existing category first
    const existing = await findExisting();
    if (existing) return existing.id;

    // 2. Category not found — create it
    try {
      const createRes = await fetch(`${API_BASE_URL}/blogs/categories/`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ name: trimmedName, slug }),
      });

      if (createRes.ok) {
        const created = await createRes.json();
        return created.id || created._id;
      }

      // POST failed (e.g. duplicate slug race condition) — try finding again
      const retry = await findExisting();
      if (retry) return retry.id;

      console.error("Category create failed:", createRes.status, await createRes.text().catch(() => ''));
      return null;
    } catch (e) {
      console.error("Error creating category:", e);
      // Last resort: try finding again
      const retry = await findExisting();
      return retry?.id || null;
    }
  },


  async googleLogin(code) {
    const response = await fetch(`${API_BASE_URL}/auth/google/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    return handleResponse(response);
  },

  getGoogleLoginUrl() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
    const scope = 'email profile';
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  },

  async uploadImage(file = null, collectionName = 'blogs', token = null, url = null) {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (url) {
      formData.append('url', url);
    }
    if (collectionName) {
      formData.append('collection_name', collectionName);
    }

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse(response);
  }
};

