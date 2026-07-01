'use server';

import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isAdmin } from '@/lib/apiAuth';

const OWNER_SELECT = 'full_name username email profile_image';
const BLOG_SELECT = 'title slug thumbnail image excerpt category_name';

function isObjectId(v) {
  return /^[0-9a-fA-F]{24}$/.test(v || '');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function serializePlaylist(doc) {
  if (!doc) return null;
  const obj = doc?.toObject ? doc.toObject() : { ...doc };
  const owner = obj.owner && typeof obj.owner === 'object' && obj.owner._id
    ? { id: obj.owner._id.toString(), full_name: obj.owner.full_name, username: obj.owner.username, email: obj.owner.email, profile_image: obj.owner.profile_image }
    : (obj.owner ? { id: obj.owner.toString() } : null);

  return {
    id: obj._id?.toString(),
    name: obj.name,
    slug: obj.slug,
    description: obj.description,
    cover_image: obj.cover_image || obj.thumbnail,
    thumbnail: obj.thumbnail || obj.cover_image,
    is_public: obj.is_public,
    owner,
    blogs: (obj.blogs || []).map((b) =>
      typeof b === 'object' && b?._id
        ? { id: b._id.toString(), title: b.title, slug: b.slug, thumbnail: b.thumbnail || b.image, excerpt: b.excerpt, category_name: b.category_name }
        : b?.toString?.()
    ),
    blog_count: obj.blog_count || 0,
    total_views: obj.total_views || 0,
    total_likes: obj.total_likes || 0,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
  };
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

export async function getPlaylistsAction(searchQuery = '', skip = 0, limit = 10, isPublic = null, ownerId = '', blogId = '') {
  try {
    await connectToDatabase();
    const query = {};

    if (isPublic === true || isPublic === 'true') query.is_public = true;
    if (ownerId) query.owner = isObjectId(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId;
    if (blogId) query.blogs = isObjectId(blogId) ? new mongoose.Types.ObjectId(blogId) : blogId;
    if (searchQuery) query.name = { $regex: searchQuery, $options: 'i' };

    const [total, docs] = await Promise.all([
      Playlist.countDocuments(query),
      Playlist.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', OWNER_SELECT)
        .populate('blogs', BLOG_SELECT)
        .lean(),
    ]);

    return { 
      total, 
      playlists: JSON.parse(JSON.stringify(docs.map(serializePlaylist)))
    };
  } catch (err) {
    console.error('getPlaylistsAction error:', err);
    throw new Error('Failed to fetch playlists');
  }
}

export async function getPlaylistByIdAction(playlistId) {
  try {
    await connectToDatabase();
    const query = isObjectId(playlistId) ? { _id: playlistId } : { slug: playlistId };
    const doc = await Playlist.findOne(query)
      .populate('owner', OWNER_SELECT)
      .populate('blogs', BLOG_SELECT)
      .lean();
      
    if (!doc) throw new Error('Playlist not found');
    
    return JSON.parse(JSON.stringify(serializePlaylist(doc)));
  } catch (err) {
    console.error('getPlaylistByIdAction error:', err);
    throw new Error('Failed to fetch playlist');
  }
}

export async function createPlaylistAction(playlistData) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    if (!playlistData.name?.trim()) {
      throw new Error('Playlist name is required');
    }

    const baseSlug = playlistData.slug?.trim() || slugify(playlistData.name);
    let slug = baseSlug;
    let counter = 1;
    while (await Playlist.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const blogs = (playlistData.blogs || [])
      .filter((id) => isObjectId(String(id)))
      .map((id) => new mongoose.Types.ObjectId(id));

    const doc = await Playlist.create({
      name: playlistData.name.trim(),
      slug,
      description: playlistData.description || '',
      cover_image: playlistData.cover_image || playlistData.thumbnail || '',
      thumbnail: playlistData.thumbnail || playlistData.cover_image || '',
      is_public: playlistData.is_public !== false,
      owner: new mongoose.Types.ObjectId(user.id),
      blogs,
      blog_count: blogs.length,
      total_views: 0,
      total_likes: 0,
    });

    const populated = await Playlist.findById(doc._id)
      .populate('owner', OWNER_SELECT)
      .populate('blogs', BLOG_SELECT)
      .lean();

    return JSON.parse(JSON.stringify(serializePlaylist(populated)));
  } catch (err) {
    console.error('createPlaylistAction error:', err);
    throw new Error(`Failed to create playlist: ${err.message}`);
  }
}

export async function deletePlaylistAction(playlistId) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const query = isObjectId(playlistId) ? { _id: playlistId } : { slug: playlistId };
    const playlist = await Playlist.findOne(query);
    if (!playlist) throw new Error('Playlist not found');

    const ownerId = playlist.owner?.toString();
    if (ownerId !== user.id && !isAdmin(user)) {
      throw new Error("You don't have permission to delete this playlist");
    }

    await Playlist.deleteOne({ _id: playlist._id });

    return { success: true };
  } catch (err) {
    console.error('deletePlaylistAction error:', err);
    throw new Error('Failed to delete playlist');
  }
}

export async function updatePlaylistAction(playlistId, playlistData) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const query = isObjectId(playlistId) ? { _id: playlistId } : { slug: playlistId };
    const playlist = await Playlist.findOne(query);
    if (!playlist) throw new Error('Playlist not found');

    const ownerId = playlist.owner?.toString();
    if (ownerId !== user.id && !isAdmin(user)) {
      throw new Error("You don't have permission to edit this playlist");
    }

    const updateSet = {};
    const allowed = ['name', 'description', 'cover_image', 'thumbnail', 'is_public'];
    for (const k of allowed) {
      if (playlistData[k] !== undefined) updateSet[k] = playlistData[k];
    }
    
    if (playlistData.name && playlistData.name.trim() !== playlist.name) {
       const baseSlug = slugify(playlistData.name.trim());
       let slug = baseSlug;
       let counter = 1;
       while (await Playlist.exists({ slug, _id: { $ne: playlist._id } })) {
         slug = `${baseSlug}-${counter++}`;
       }
       updateSet.slug = slug;
    }

    await Playlist.updateOne({ _id: playlist._id }, { $set: updateSet });
    const updated = await Playlist.findById(playlist._id)
      .populate('owner', OWNER_SELECT)
      .populate('blogs', BLOG_SELECT)
      .lean();

    return JSON.parse(JSON.stringify(serializePlaylist(updated)));
  } catch (err) {
    console.error('updatePlaylistAction error:', err);
    throw new Error('Failed to update playlist');
  }
}

export async function addBlogToPlaylistAction(playlistId, blogData) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const query = isObjectId(playlistId) ? { _id: playlistId } : { slug: playlistId };
    const playlist = await Playlist.findOne(query);
    if (!playlist) throw new Error('Playlist not found');

    const ownerId = playlist.owner?.toString();
    if (ownerId !== user.id && !isAdmin(user)) {
      throw new Error("You don't have permission to edit this playlist");
    }
    
    if (!blogData.blog_id || !isObjectId(blogData.blog_id)) {
      throw new Error("Invalid blog ID");
    }

    const blogOid = new mongoose.Types.ObjectId(blogData.blog_id);
    if (!playlist.blogs.includes(blogOid)) {
      playlist.blogs.push(blogOid);
      playlist.blog_count = playlist.blogs.length;
      await playlist.save();
    }

    const updated = await Playlist.findById(playlist._id)
      .populate('owner', OWNER_SELECT)
      .populate('blogs', BLOG_SELECT)
      .lean();

    return JSON.parse(JSON.stringify(serializePlaylist(updated)));
  } catch (err) {
    console.error('addBlogToPlaylistAction error:', err);
    throw new Error('Failed to add blog to playlist');
  }
}

export async function removeBlogFromPlaylistAction(playlistId, blogId) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const query = isObjectId(playlistId) ? { _id: playlistId } : { slug: playlistId };
    const playlist = await Playlist.findOne(query);
    if (!playlist) throw new Error('Playlist not found');

    const ownerId = playlist.owner?.toString();
    if (ownerId !== user.id && !isAdmin(user)) {
      throw new Error("You don't have permission to edit this playlist");
    }

    if (isObjectId(blogId)) {
      playlist.blogs = playlist.blogs.filter(id => id.toString() !== blogId);
      playlist.blog_count = playlist.blogs.length;
      await playlist.save();
    }

    const updated = await Playlist.findById(playlist._id)
      .populate('owner', OWNER_SELECT)
      .populate('blogs', BLOG_SELECT)
      .lean();

    return JSON.parse(JSON.stringify(serializePlaylist(updated)));
  } catch (err) {
    console.error('removeBlogFromPlaylistAction error:', err);
    throw new Error('Failed to remove blog from playlist');
  }
}
