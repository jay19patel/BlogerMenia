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

  async toggleFeaturedBlog(token, blogId) {
    const response = await fetch(`${API_BASE_URL}/admin/blogs/${blogId}/toggle-featured/`, {
      method: 'PUT',
      headers: getHeaders(token),
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

  // Get blogs for currently authenticated user (requires token)
  async getMyBlogs(token, searchQuery = null, skip = 0, limit = 10, filter = null) {
    let url = `${API_BASE_URL}/blogs/my-blogs/?skip=${skip}&limit=${limit}`;

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

  async likeBlog(blogId, token) {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/like/`, {
      method: 'POST',
      headers: getHeaders(token),
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
    const response = await fetch(`${API_BASE_URL}/playlists/public/`, {
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

  // Mock Data for Testimonials
  async getTestimonials() {
    return {
      testimonials: [
        {
          name: "Sarah Jenkins",
          role: "Content Creator",
          image: "https://pagedone.io/asset/uploads/1696229969.png",
          rating: 5,
          content: "BlogerMenia has completely transformed how I share my thoughts. The platform is intuitive and the community is incredibly supportive."
        },
        {
          name: "David Miller",
          role: "Tech Blogger",
          image: "https://pagedone.io/asset/uploads/1696229994.png",
          rating: 5,
          content: "The best blogging platform I've used. The editor is powerful yet simple, and managing my posts is a breeze."
        },
        {
          name: "Emily Chen",
          role: "Travel Writer",
          image: "https://pagedone.io/asset/uploads/1696230027.png",
          rating: 4,
          content: "I love the clean design and how easy it is to connect with readers. Highly recommended for anyone starting a blog."
        }
      ]
    };
  },

  // Mock Data for FAQs
  async getFAQs() {
    return {
      faqs: [
        {
          id: 1,
          question: "How do I get started with BlogerMenia?",
          answer: "Getting started is easy! Simply sign up for an account, complete your profile, and click on 'Write' to start creating your first blog post."
        },
        {
          id: 2,
          question: "Is BlogerMenia free to use?",
          answer: "Yes, BlogerMenia is free to use for all writers and readers. We believe in open access to knowledge and creativity."
        },
        {
          id: 3,
          question: "Can I customize my blog's appearance?",
          answer: "Currently, we offer a clean, standardized layout to ensure readability. We are working on more customization options for the future."
        },
        {
          id: 4,
          question: "How do I grow my audience?",
          answer: "Engage with other writers, share your posts on social media, and consistently publish high-quality content. Using relevant tags also helps readers find your work."
        }
      ]
    };
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

  async getUserPlaylistsByEmail(email, userId, token = null, isOwner = false) {
    let url = `${API_BASE_URL}/playlists/?owner.$id=${userId}`;
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
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  async updatePlaylist(playlistId, playlistData, token) {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/`, {
      method: 'PUT',
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

  getGoogleLoginUrl() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
    const scope = 'email profile';
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  },

  async uploadImage(file, collectionName = 'blogs', token = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (collectionName) {
      formData.append('collection_name', collectionName);
    }

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/media/upload/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse(response);
  }
};

