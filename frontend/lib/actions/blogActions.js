'use server';

import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import User from '@/models/User';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isAdmin } from '@/lib/apiAuth';

const AUTHOR_SELECT = 'full_name username email profile_image headline bio blog_count total_views';
const CATEGORY_SELECT = 'name slug';

function isObjectId(v) {
  return /^[0-9a-fA-F]{24}$/.test(v || '');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

function serializeBlog(doc) {
  if (!doc) return null;
  const obj = doc?.toObject ? doc.toObject({ virtuals: false }) : { ...doc };
  const id = obj._id?.toString() || obj.id;
  const author = obj.author && typeof obj.author === 'object' && obj.author._id
    ? { id: obj.author._id.toString(), ...pick(obj.author, ['full_name', 'username', 'email', 'profile_image', 'headline']) }
    : (obj.author ? { id: obj.author.toString() } : null);
  const category = obj.category && typeof obj.category === 'object' && obj.category._id
    ? { id: obj.category._id.toString(), name: obj.category.name, slug: obj.category.slug }
    : null;

  return {
    id,
    slug: obj.slug,
    title: obj.title,
    subtitle: obj.subtitle,
    excerpt: obj.excerpt,
    content: obj.content,
    thumbnail: obj.thumbnail || obj.image,
    image: obj.image || obj.thumbnail,
    author,
    category,
    category_name: obj.category_name,
    featured: obj.featured,
    is_published: obj.is_published,
    views: obj.views,
    likes: obj.likes,
    tags: obj.tags || [],
    published_date: obj.publishedDate,
    publishedDate: obj.publishedDate,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
  };
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

export async function getBlogsAction(searchQuery = '', skip = 0, limit = 10, filter = '', authorId = '') {
  try {
    await connectToDatabase();
    const query = {};

    if (filter && filter !== 'All') {
      const cat = await Category.findOne({ name: { $regex: new RegExp(`^${escapeRegex(filter)}$`, 'i') } });
      if (!cat) return { total: 0, blogs: [] };
      query.category = cat._id;
    }

    if (authorId) {
      query.author = isObjectId(authorId) ? new mongoose.Types.ObjectId(authorId) : authorId;
    }

    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { excerpt: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const [total, docs] = await Promise.all([
      Blog.countDocuments(query),
      Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', AUTHOR_SELECT)
        .populate('category', CATEGORY_SELECT)
        .lean(),
    ]);

    return { total, blogs: docs.map(serializeBlog) };
  } catch (err) {
    console.error('getBlogsAction error:', err);
    throw new Error('Failed to fetch blogs');
  }
}

export async function getFeaturedBlogsAction() {
  try {
    await connectToDatabase();
    const docs = await Blog.find({})
        .sort({ views: -1 })
        .limit(6)
        .populate('author', AUTHOR_SELECT)
        .populate('category', CATEGORY_SELECT)
        .lean();
    return docs.map(serializeBlog);
  } catch (err) {
    console.error('getFeaturedBlogsAction error:', err);
    throw new Error('Failed to fetch featured blogs');
  }
}

export async function getBlogBySlugAction(slug, trackView = true) {
  try {
    await connectToDatabase();
    const query = isObjectId(slug) ? { _id: slug } : { slug };
    const blog = await Blog.findOne(query)
      .populate('author', AUTHOR_SELECT)
      .populate('category', CATEGORY_SELECT);
    
    if (!blog) throw new Error('Blog not found');

    if (trackView) {
      const authorId = blog.author?._id || blog.author;
      await Promise.all([
        Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } }),
        authorId ? User.updateOne({ _id: authorId }, { $inc: { total_views: 1 } }) : Promise.resolve(),
      ]);
      blog.views = (blog.views || 0) + 1;
    }

    // Force string serialization to avoid passing raw ObjectId objects to Client Components
    return JSON.parse(JSON.stringify(serializeBlog(blog)));
  } catch (err) {
    console.error('getBlogBySlugAction error:', err);
    throw new Error('Failed to fetch blog');
  }
}

export async function createBlogAction(blogData) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const baseSlug = slugify(blogData.title || 'untitled');
    let slug = baseSlug;
    let counter = 1;
    while (await Blog.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const content = blogData.content || {};
    if (blogData.introduction != null) content.introduction = blogData.introduction;
    if (blogData.conclusion != null) content.conclusion = blogData.conclusion;
    if (blogData.sections != null) content.sections = blogData.sections;

    let categoryOid = null;
    let categoryName = null;
    if (blogData.category) {
      const cat = isObjectId(blogData.category)
        ? await Category.findById(blogData.category)
        : await Category.findOne({ name: { $regex: new RegExp(`^${escapeRegex(blogData.category)}$`, 'i') } });
      if (cat) { categoryOid = cat._id; categoryName = cat.name; }
    }

    const now = new Date();
    const doc = await Blog.create({
      title: blogData.title,
      slug,
      subtitle: blogData.subtitle,
      excerpt: blogData.excerpt,
      content,
      thumbnail: blogData.thumbnail || blogData.image || '',
      image: blogData.image || blogData.thumbnail || '',
      author: new mongoose.Types.ObjectId(user.id),
      category: categoryOid,
      category_name: categoryName,
      tags: blogData.tags || [],
      featured: blogData.featured || false,
      is_published: blogData.is_published !== false,
      views: 0,
      likes: 0,
      publishedDate: blogData.publishedDate || now,
    });

    await User.updateOne({ _id: user.id }, { $inc: { blog_count: 1 } });

    const populated = await Blog.findById(doc._id)
      .populate('author', AUTHOR_SELECT)
      .populate('category', CATEGORY_SELECT)
      .lean();

    return JSON.parse(JSON.stringify(serializeBlog(populated)));
  } catch (err) {
    console.error('createBlogAction error:', err);
    throw new Error(`Failed to create blog: ${err.message}`);
  }
}

export async function deleteBlogAction(slug) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug });
    if (!blog) throw new Error('Blog not found');

    const authorId = blog.author?.toString();
    if (authorId !== user.id && !isAdmin(user)) {
      throw new Error("You don't have permission to delete this blog");
    }

    await Promise.all([
      Blog.deleteOne({ _id: blog._id }),
      User.updateOne({ _id: authorId }, { $inc: { blog_count: -1 } }),
    ]);

    return { success: true };
  } catch (err) {
    console.error('deleteBlogAction error:', err);
    throw new Error('Failed to delete blog');
  }
}

export async function updateBlogAction(slug, blogData) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user) throw new Error('Not authenticated');

    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug });
    if (!blog) throw new Error('Blog not found');

    const authorId = blog.author?.toString();
    if (authorId !== user.id && !isAdmin(user)) {
      throw new Error("You don't have permission to edit this blog");
    }

    const updateSet = {};
    const intro = blogData.introduction ?? undefined;
    const concl = blogData.conclusion ?? undefined;
    const sects = blogData.sections ?? undefined;

    if (intro !== undefined || concl !== undefined || sects !== undefined) {
      const existing = blog.content || {};
      updateSet.content = {
        introduction: intro !== undefined ? intro : existing.introduction,
        conclusion: concl !== undefined ? concl : existing.conclusion,
        sections: sects !== undefined ? sects : existing.sections || [],
      };
    } else if (blogData.content) {
      updateSet.content = blogData.content;
    }

    if (blogData.category !== undefined && blogData.category !== null) {
      const cat = isObjectId(blogData.category)
        ? await Category.findById(blogData.category)
        : await Category.findOne({ name: { $regex: new RegExp(`^${escapeRegex(blogData.category)}$`, 'i') } });
      updateSet.category = cat?._id || null;
      updateSet.category_name = cat?.name || null;
    }

    const allowed = ['title', 'subtitle', 'excerpt', 'thumbnail', 'image', 'featured', 'is_published', 'tags', 'publishedDate'];
    for (const k of allowed) {
      if (blogData[k] !== undefined) updateSet[k] = blogData[k];
    }

    await Blog.updateOne({ _id: blog._id }, { $set: updateSet });
    const updated = await Blog.findOne({ _id: blog._id })
      .populate('author', AUTHOR_SELECT)
      .populate('category', CATEGORY_SELECT);

    return JSON.parse(JSON.stringify(serializeBlog(updated)));
  } catch (err) {
    console.error('updateBlogAction error:', err);
    throw new Error('Failed to update blog');
  }
}

export async function toggleBlogFeaturedAction(slug, featured) {
  try {
    await connectToDatabase();
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) throw new Error('Not authorized');

    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug });
    if (!blog) throw new Error('Blog not found');

    await Blog.updateOne({ _id: blog._id }, { $set: { featured } });
    return { success: true, featured };
  } catch (err) {
    console.error('toggleBlogFeaturedAction error:', err);
    throw new Error('Failed to toggle featured');
  }
}

export async function getRelatedBlogsAction(slug, limit = 3) {
  try {
    await connectToDatabase();
    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug }).select('category _id');
    if (!blog) return [];

    const docs = await Blog.find({ category: blog.category, _id: { $ne: blog._id } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', AUTHOR_SELECT)
      .populate('category', CATEGORY_SELECT)
      .lean();
    return JSON.parse(JSON.stringify(docs.map(serializeBlog)));
  } catch (err) {
    console.error('getRelatedBlogsAction error:', err);
    return [];
  }
}

export async function getCategoriesAction(username = null) {
  try {
    await connectToDatabase();
    if (username) {
      const user = await User.findOne({ $or: [{ email: username }, { username }] }).select('_id');
      if (!user) return [];
      const categoryIds = await Blog.distinct('category', { author: user._id, is_published: true });
      const cats = await Category.find({ _id: { $in: categoryIds } }).sort({ name: 1 }).lean();
      return JSON.parse(JSON.stringify(cats.map(c => ({ id: c._id.toString(), name: c.name, slug: c.slug }))));
    }
    const cats = await Category.find({}).sort({ name: 1 }).lean();
    return JSON.parse(JSON.stringify(cats.map(c => ({ id: c._id.toString(), name: c.name, slug: c.slug }))));
  } catch (err) {
    console.error('getCategoriesAction error:', err);
    throw new Error('Failed to fetch categories');
  }
}

export async function createCategoryAction(name, slugInput = null) {
  try {
    await connectToDatabase();
    if (!name?.trim()) throw new Error('Category name is required');

    const trimmed = name.trim();
    const slug = slugInput?.trim() || trimmed.toLowerCase()
      .replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

    const cat = await Category.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') } },
      { $setOnInsert: { name: trimmed, slug } },
      { upsert: true, new: true, lean: true },
    );
    return { id: cat._id.toString(), name: cat.name, slug: cat.slug };
  } catch (err) {
    console.error('createCategoryAction error:', err);
    throw new Error('Failed to create category');
  }
}

export async function getStatsAction() {
  try {
    await connectToDatabase();
    const [total_blogs, total_users, active_users] = await Promise.all([
      Blog.countDocuments({ is_published: true }),
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
    ]);
    return { total_blogs, total_users, active_users };
  } catch (err) {
    console.error('getStatsAction error:', err);
    throw new Error('Failed to fetch stats');
  }
}
