const fs = require('fs');

const content = `// ─────────────────────────────────────────────────────────────────────────────
//  API client — All requests are now mapped entirely to Next.js Server Actions
// ─────────────────────────────────────────────────────────────────────────────

import { 
  getBlogsAction, 
  getFeaturedBlogsAction, 
  getBlogBySlugAction, 
  createBlogAction, 
  deleteBlogAction,
  updateBlogAction,
  toggleBlogFeaturedAction,
  getRelatedBlogsAction,
  getCategoriesAction,
  createCategoryAction,
  getStatsAction
} from '@/lib/actions/blogActions';

import {
  getPlaylistsAction,
  getPlaylistByIdAction,
  createPlaylistAction,
  deletePlaylistAction,
  updatePlaylistAction,
  addBlogToPlaylistAction,
  removeBlogFromPlaylistAction
} from '@/lib/actions/playlistActions';

import {
  getBlogInteractionAction,
  toggleBlogLikeAction,
  toggleBlogBookmarkAction,
  getUserProfileByEmailAction,
  getMyBookmarksAction,
  getMyLikesAction,
  updateUserProfileAction,
  getUserByIdAction,
  getAllUsersAction,
  toggleUserStatusAction,
  getAllCreatorsAction,
  getTopAuthorsAction
} from '@/lib/actions/userActions';

import { uploadImageAction } from '@/lib/actions/mediaActions';
import { submitContactFormAction, getTestimonialsAction, getFaqsAction } from '@/lib/actions/contentActions';
import { generateBlogAction, getSessionStateAction, saveGeneratedBlogAction, deleteSessionAction } from '@/lib/actions/chatActions';

function clearBackendToken() {
  // Legacy function kept for compatibility
}

export const api = {
  // ── Auth / Session (Next.js) ─────────────────────────────────────────────
  async getCurrentUser() {
    const res = await fetch('/api/auth/session', { method: 'GET' });
    if (!res.ok) throw new Error('Not logged in');
    return res.json();
  },

  // ── User ───────────────────────────────────────────────────────
  async updateUserProfile(token, updateData) {
    return await updateUserProfileAction(updateData);
  },

  async getUserById(userId) {
    return await getUserByIdAction(userId);
  },

  async getUserProfileByEmail(email) {
    return await getUserProfileByEmailAction(email);
  },

  async getAllUsers() {
    return await getAllUsersAction();
  },

  async activateUser(token, userId) {
    return await toggleUserStatusAction(userId, true);
  },

  async deactivateUser(token, userId) {
    return await toggleUserStatusAction(userId, false);
  },

  async getAllCreators(searchQuery = null, skip = 0, limit = 10) {
    return await getAllCreatorsAction(searchQuery, skip, limit);
  },

  async getTopAuthors() {
    return await getTopAuthorsAction();
  },

  // ── Blogs ────────────────────────────────────────
  async getBlogs(searchQuery = null, skip = 0, limit = 10, category = null, authorId = null) {
    const filter = category ? { category } : null;
    return await getBlogsAction(searchQuery, skip, limit, filter, authorId);
  },

  async getFeaturedBlogs() {
    return await getFeaturedBlogsAction(6);
  },

  async getMyBlogs(token, userId) {
    return await getBlogsAction(null, 0, 100, null, userId);
  },

  async getBlogBySlug(slug) {
    return await getBlogBySlugAction(slug);
  },

  async createBlog(blogData) {
    return await createBlogAction(blogData);
  },

  async updateBlog(slug, blogData) {
    return await updateBlogAction(slug, blogData);
  },

  async deleteBlog(slug) {
    return await deleteBlogAction(slug);
  },

  async getBlogInteraction(slug) {
    return await getBlogInteractionAction(slug);
  },

  async likeBlog(token, slug) {
    return await toggleBlogLikeAction(slug);
  },

  async saveBookmark(token, slug) {
    return await toggleBlogBookmarkAction(slug);
  },

  async deleteBookmark(token, slug) {
    return await toggleBlogBookmarkAction(slug);
  },

  async getMyBookmarks(limit = 20) {
    return await getMyBookmarksAction(limit);
  },

  async getMyLikes(limit = 20) {
    return await getMyLikesAction(limit);
  },

  async getMyLikedBlogIds(limit = 100) {
    const res = await getMyLikesAction(limit);
    return res.likes ? res.likes.map(l => l.blog.id) : [];
  },

  async toggleFeaturedBlog(token, blogId, newStatus) {
    return await toggleBlogFeaturedAction(blogId, newStatus);
  },

  async getRelatedBlogs(slug, limit = 3) {
    return await getRelatedBlogsAction(slug, limit);
  },

  async getBlogsByAuthor(username = null) {
    return await getBlogsAction(null, 0, 20, null, username); 
  },

  async getBlogsByCategory(slug) {
    return await getBlogsAction(null, 0, 20, { category: slug });
  },

  async searchBlogs(query) {
    return await getBlogsAction(query, 0, 20);
  },

  // ── Categories ──────────────────────────────────────────────────
  async getBlogCategories(username = null) {
    return await getCategoriesAction(username);
  },

  async getCategories() {
    return await getCategoriesAction();
  },

  async getOrCreateCategory(name) {
    const res = await createCategoryAction(name);
    return res.id;
  },

  // ── Stats ───────────────────────────────────────────────────────
  async getStats() {
    return await getStatsAction();
  },

  // ── AI Chat ─────────────────────────────────────────────────────
  async generateBlog(userMessage, sessionId = null) {
    return await generateBlogAction(userMessage, sessionId);
  },

  async getSessionState(sessionId) {
    return await getSessionStateAction(sessionId);
  },

  async saveGeneratedBlog(sessionId) {
    return await saveGeneratedBlogAction(sessionId);
  },

  async deleteSession(sessionId) {
    return await deleteSessionAction(sessionId);
  },

  // ── Media ───────────────────────────────────────────────────────
  async uploadImage(file = null, collectionName = 'blogs', token = null, url = null) {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (url) formData.append('url', url);
    if (collectionName) formData.append('folder', collectionName);
    return await uploadImageAction(formData);
  },

  // ── Playlists ────────────────────────────────────
  async getPublicPlaylists() {
    return await getPlaylistsAction(null, 0, 10, true);
  },

  async getPlaylists(searchQuery = null, skip = 0, limit = 10, ownerId = null) {
    return await getPlaylistsAction(searchQuery, skip, limit, true, ownerId);
  },

  async getPopularPlaylists() {
    return await getPlaylistsAction(null, 0, 6, true);
  },

  async createPlaylist(playlistData) {
    return await createPlaylistAction(playlistData);
  },

  async getMyPlaylists(token, userId) {
    return await getPlaylistsAction(null, 0, 100, null, userId);
  },

  async getUserPlaylistsByEmail(email, userId, token = null, isOwner = false, skip = 0, limit = 10) {
    return await getPlaylistsAction(null, skip, limit, !isOwner, userId);
  },

  async getPlaylist(playlistId) {
    return await getPlaylistByIdAction(playlistId);
  },

  async updatePlaylist(playlistId, playlistData) {
    return await updatePlaylistAction(playlistId, playlistData);
  },

  async deletePlaylist(playlistIdOrSlug) {
    return await deletePlaylistAction(playlistIdOrSlug);
  },

  async addBlogToPlaylist(playlistIdOrSlug, blogData) {
    return await addBlogToPlaylistAction(playlistIdOrSlug, blogData);
  },

  async removeBlogFromPlaylist(playlistIdOrSlug, blogId) {
    return await removeBlogFromPlaylistAction(playlistIdOrSlug, blogId);
  },

  async getBlogPlaylists(blogId) {
    return await getPlaylistsAction(null, 0, 100, null, null, blogId);
  },

  // ── Content ─────────────────────────────────────────────────────
  async contactUs(data) {
    return await submitContactFormAction(data);
  },

  async getTestimonials() {
    return await getTestimonialsAction();
  },

  async getFAQs() {
    return await getFaqsAction();
  },

  async submitTestimonial(token, data) {
    // mapped to contact for now as per minimal setup
    return await submitContactFormAction(data);
  },

  clearBackendToken,
};
`;

fs.writeFileSync('lib/api.js', content);
