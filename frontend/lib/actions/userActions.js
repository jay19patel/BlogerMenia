'use server';

import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import Like from '@/models/Like';
import Bookmark from '@/models/Bookmark';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

function isObjectId(v) {
  return /^[0-9a-fA-F]{24}$/.test(v || '');
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

export async function getBlogInteractionAction(slug) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug }).select('_id');
    if (!blog) throw new Error('Blog not found');

    const userId = new mongoose.Types.ObjectId(user.id);
    const [likeDoc, bookmarkDoc] = await Promise.all([
      Like.findOne({ user: userId, blog: blog._id }).select('_id'),
      Bookmark.findOne({ user: userId, blog: blog._id }),
    ]);

    const bookmark = bookmarkDoc
      ? {
          id: bookmarkDoc._id.toString(),
          blog_id: blog._id.toString(),
          section_id: bookmarkDoc.section_id,
          section_title: bookmarkDoc.section_title,
          created_at: bookmarkDoc.createdAt,
          updated_at: bookmarkDoc.updatedAt,
        }
      : null;

    return { has_liked: !!likeDoc, bookmark };
  } catch (err) {
    console.error('getBlogInteractionAction error:', err);
    throw new Error('Failed to fetch interaction');
  }
}

export async function toggleBlogLikeAction(slug) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug });
    if (!blog) throw new Error('Blog not found');

    const userId = new mongoose.Types.ObjectId(user.id);
    const existing = await Like.findOne({ user: userId, blog: blog._id });

    if (existing) {
      await Promise.all([
        Like.deleteOne({ _id: existing._id }),
        Blog.updateOne({ _id: blog._id }, { $inc: { likes: -1 } }),
      ]);
      return { message: 'Unliked successfully', liked: false };
    } else {
      await Promise.all([
        Like.create({ user: userId, blog: blog._id }),
        Blog.updateOne({ _id: blog._id }, { $inc: { likes: 1 } }),
      ]);
      return { message: 'Liked successfully', liked: true };
    }
  } catch (err) {
    console.error('toggleBlogLikeAction error:', err);
    throw new Error('Failed to toggle like');
  }
}

export async function toggleBlogBookmarkAction(slug, section_id = null, section_title = null) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug });
    if (!blog) throw new Error('Blog not found');

    const userId = new mongoose.Types.ObjectId(user.id);
    const existing = await Bookmark.findOne({ user: userId, blog: blog._id });

    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      return { message: 'Removed from bookmarks', bookmarked: false };
    } else {
      await Bookmark.create({
        user: userId,
        blog: blog._id,
        section_id: section_id || null,
        section_title: section_title || null,
      });
      return { message: 'Added to bookmarks', bookmarked: true };
    }
  } catch (err) {
    console.error('toggleBlogBookmarkAction error:', err);
    throw new Error('Failed to toggle bookmark');
  }
}

export async function getUserProfileByEmailAction(email) {
  try {
    await connectToDatabase();
    const user = await User.findOne({ email }).lean();
    if (!user) throw new Error('User not found');
    
    return JSON.parse(JSON.stringify({
      id: user._id.toString(),
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      profile_image: user.profile_image,
      headline: user.headline,
      bio: user.bio,
      linkedin_id: user.linkedin_id,
      blog_count: user.blog_count || 0,
      total_views: user.total_views || 0,
      createdAt: user.createdAt,
    }));
  } catch (err) {
    console.error('getUserProfileByEmailAction error:', err);
    throw new Error('Failed to fetch user profile');
  }
}

export async function getMyBookmarksAction(limit = 20) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const docs = await Bookmark.find({ user: new mongoose.Types.ObjectId(user.id) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'blog',
        select: 'title slug excerpt thumbnail image category_name author',
        populate: { path: 'author', select: 'full_name username email profile_image' }
      })
      .lean();

    return JSON.parse(JSON.stringify({
      bookmarks: docs.map(doc => ({
        id: doc._id.toString(),
        blog: doc.blog ? {
          ...doc.blog,
          id: doc.blog._id?.toString(),
          author: doc.blog.author ? { ...doc.blog.author, id: doc.blog.author._id?.toString() } : null
        } : null,
        section_id: doc.section_id,
        section_title: doc.section_title,
        created_at: doc.createdAt
      }))
    }));
  } catch (err) {
    console.error('getMyBookmarksAction error:', err);
    throw new Error('Failed to fetch bookmarks');
  }
}

export async function getMyLikesAction(limit = 20) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const docs = await Like.find({ user: new mongoose.Types.ObjectId(user.id) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'blog',
        select: 'title slug excerpt thumbnail image category_name author',
        populate: { path: 'author', select: 'full_name username email profile_image' }
      })
      .lean();

    return JSON.parse(JSON.stringify({
      likes: docs.map(doc => ({
        id: doc._id.toString(),
        blog: doc.blog ? {
          ...doc.blog,
          id: doc.blog._id?.toString(),
          author: doc.blog.author ? { ...doc.blog.author, id: doc.blog.author._id?.toString() } : null
        } : null,
        created_at: doc.createdAt
      }))
    }));
  } catch (err) {
    console.error('getMyLikesAction error:', err);
    throw new Error('Failed to fetch likes');
  }
}

export async function getAllCreatorsAction(searchQuery = '', skip = 0, limit = 10) {
  try {
    await connectToDatabase();
    const query = { role: { $ne: 'Admin' } };
    if (searchQuery) {
      query.$or = [
        { full_name: { $regex: searchQuery, $options: 'i' } },
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const [total, docs] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .sort({ blog_count: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('full_name username email profile_image headline blog_count total_views createdAt')
        .lean(),
    ]);

    return JSON.parse(JSON.stringify({
      total,
      users: docs.map(u => ({ ...u, id: u._id.toString() }))
    }));
  } catch (err) {
    console.error('getAllCreatorsAction error:', err);
    throw new Error('Failed to fetch creators');
  }
}

export async function getTopAuthorsAction() {
  try {
    await connectToDatabase();
    const docs = await User.find({ blog_count: { $gt: 0 } })
      .sort({ blog_count: -1, total_views: -1 })
      .limit(6)
      .select('full_name username email profile_image headline blog_count total_views')
      .lean();
    return JSON.parse(JSON.stringify(docs.map(u => ({ ...u, id: u._id.toString() }))));
  } catch (err) {
    console.error('getTopAuthorsAction error:', err);
    throw new Error('Failed to fetch top authors');
  }
}

export async function updateUserProfileAction(updateData) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const updateSet = {};
    const allowed = ['full_name', 'username', 'headline', 'bio', 'profile_image', 'linkedin_id'];
    for (const k of allowed) {
      if (updateData[k] !== undefined) updateSet[k] = updateData[k];
    }

    if (updateSet.username) {
       const existing = await User.findOne({ username: updateSet.username, _id: { $ne: user.id } });
       if (existing) throw new Error("Username already taken");
    }

    await User.updateOne({ _id: user.id }, { $set: updateSet });
    
    return { success: true };
  } catch (err) {
    console.error('updateUserProfileAction error:', err);
    throw new Error(`Failed to update profile: ${err.message}`);
  }
}

export async function getUserByIdAction(userId) {
  try {
    await connectToDatabase();
    if (!isObjectId(userId)) throw new Error("Invalid user ID");
    const doc = await User.findById(userId)
      .select('full_name username email profile_image headline bio is_active blog_count total_views role createdAt')
      .lean();
    if (!doc) throw new Error("User not found");
    
    return JSON.parse(JSON.stringify({ ...doc, id: doc._id.toString() }));
  } catch (err) {
    console.error('getUserByIdAction error:', err);
    throw new Error('Failed to fetch user');
  }
}

export async function getAllUsersAction() {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) throw new Error("Not authorized");

    const docs = await User.find({})
      .sort({ createdAt: -1 })
      .select('full_name username email profile_image role is_active blog_count total_views createdAt last_login_date')
      .lean();
    
    return JSON.parse(JSON.stringify({ users: docs.map(u => ({ ...u, id: u._id.toString() })) }));
  } catch (err) {
    console.error('getAllUsersAction error:', err);
    throw new Error('Failed to fetch all users');
  }
}

export async function toggleUserStatusAction(userId, activate) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) throw new Error("Not authorized");

    await User.updateOne({ _id: userId }, { $set: { is_active: activate } });
    return { success: true };
  } catch (err) {
    console.error('toggleUserStatusAction error:', err);
    throw new Error('Failed to update user status');
  }
}
