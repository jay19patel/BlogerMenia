// API base URL - can be overridden with environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Helper function to handle API responses
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP error! status: ${response.status}`
    }));

    // Create error object with full details for better error handling
    const error = new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.response = {
      status: response.status,
      data: errorData
    };
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
    const response = await fetch(`${API_BASE_URL}/user/me`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async updateUserProfile(token, updateData) {
    const response = await fetch(`${API_BASE_URL}/user/me`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  },

  async getUserById(userId) {
    const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getUserProfileByUsername(username) {
    const response = await fetch(`${API_BASE_URL}/user/profile/${username}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Admin endpoints
  async getAllUsers(token) {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async activateUser(token, userId) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/activate`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async deactivateUser(token, userId) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/deactivate`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async toggleFeaturedBlog(token, blogId) {
    const response = await fetch(`${API_BASE_URL}/admin/blogs/${blogId}/toggle-featured`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  // Blog endpoints
  async getBlogs(searchQuery = null, skip = 0, limit = 10, filter = null, username = null) {
    let url = `${API_BASE_URL}/blogs?skip=${skip}&limit=${limit}`;

    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    // filter can be "featuredBlogs" for featured blogs, or a category name, or null/"All" for no filter
    if (filter && filter !== "All") {
      url += `&filter=${encodeURIComponent(filter)}`;
    }

    // CRITICAL: Always pass username if provided to filter results
    if (username) {
      url += `&username=${encodeURIComponent(username)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Get blogs for currently authenticated user (requires token)
  async getMyBlogs(token, searchQuery = null, skip = 0, limit = 10, filter = null) {
    let url = `${API_BASE_URL}/blogs/my-blogs?skip=${skip}&limit=${limit}`;

    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    // filter can be "featuredBlogs" for featured blogs, or a category name, or null/"All" for no filter
    if (filter && filter !== "All") {
      url += `&filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),  // CRITICAL: Requires authentication token
    });
    return handleResponse(response);
  },

  async getBlogById(blogId, token = null) {
    const response = await fetch(`${API_BASE_URL}/blogs/id/${blogId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async getBlogBySlug(slug) {
    const response = await fetch(`${API_BASE_URL}/blogs/${slug}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createBlog(blogData, token) {
    const response = await fetch(`${API_BASE_URL}/blogs`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  async updateBlog(blogId, blogData, token) {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  async likeBlog(blogId) {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/like`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getSuggestedBlogs(limit = 3, excludeSlug = null) {
    let url = `${API_BASE_URL}/blogs/suggested_blogs?limit=${limit}`;
    if (excludeSlug) {
      url += `&exclude_slug=${encodeURIComponent(excludeSlug)}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    // Return blogs array from the response
    return result.blogs || [];
  },

  async getBlogCategories(username = null) {
    // If username provided, filter categories by that user
    // If not provided, get all categories (for main /blogs page)
    let url = `${API_BASE_URL}/blogs/categories`;
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
    const response = await fetch(`${API_BASE_URL}/blogs/stats`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Content endpoints
  async getTestimonials() {
    const response = await fetch(`${API_BASE_URL}/content/testimonials`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getFAQs() {
    const response = await fetch(`${API_BASE_URL}/content/faqs`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Chat/Generation endpoints
  async generateBlog(userMessage, sessionId = null) {
    const response = await fetch(`${API_BASE_URL}/chat/generate`, {
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
    const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async saveGeneratedBlog(sessionId, token) {
    const response = await fetch(`${API_BASE_URL}/chat/save`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ session_id: sessionId }),
    });
    return handleResponse(response);
  },

  async deleteSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/chat/session/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Playlist endpoints
  async createPlaylist(playlistData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(playlistData),
    });
    return handleResponse(response);
  },

  async getMyPlaylists(token) {
    const response = await fetch(`${API_BASE_URL}/playlists/my-playlists`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async getUserPlaylistsByUsername(username) {
    const response = await fetch(`${API_BASE_URL}/playlists/user/${username}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getPlaylist(playlistId, token = null) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async updatePlaylist(playlistId, playlistData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(playlistData),
    });
    return handleResponse(response);
  },

  async deletePlaylist(playlistId, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    // DELETE returns 204 No Content, so don't try to parse JSON
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true };
  },

  async addBlogToPlaylist(playlistId, blogData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/blogs`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  async removeBlogFromPlaylist(playlistId, blogId, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/blogs/${blogId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },


  async getBlogPlaylists(blogId, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/blog/${blogId}/playlists`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  // Notes endpoints
  async getNotes(token) {
    const response = await fetch(`${API_BASE_URL}/notes/`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async getMyNotes(token) {
    const response = await fetch(`${API_BASE_URL}/notes/my_notes/`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async createNote(noteData, token) {
    const response = await fetch(`${API_BASE_URL}/notes/`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(noteData),
    });
    return handleResponse(response);
  },

  async updateNote(noteId, noteData, token) {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(noteData),
    });
    return handleResponse(response);
  },

  async deleteNote(noteId, token) {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { success: true };
  },

  async likeNote(noteId, token) {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/like/`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};

