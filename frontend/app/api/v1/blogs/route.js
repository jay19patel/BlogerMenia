import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import User from '@/models/User';
import Category from '@/models/Category';
import { verifyBearerToken } from '@/lib/apiAuth';

const AUTHOR_SELECT = 'full_name username email profile_image headline bio blog_count total_views';
const CATEGORY_SELECT = 'name slug';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isObjectId(v) {
  return /^[0-9a-fA-F]{24}$/.test(v || '');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function serializeBlog(doc) {
  const obj = doc?.toObject ? doc.toObject({ virtuals: false }) : { ...doc };
  const id = obj._id?.toString() || obj.id;
  const author = obj.author && typeof obj.author === 'object' && obj.author._id
    ? { id: obj.author._id.toString(), ...pick(obj.author, ['full_name', 'username', 'email', 'profile_image', 'headline']) }
    : obj.author;
  const category = obj.category && typeof obj.category === 'object' && obj.category._id
    ? { id: obj.category._id.toString(), name: obj.category.name, slug: obj.category.slug }
    : obj.category;

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

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

// ─── GET /api/v1/blogs ───────────────────────────────────────────────────────

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const categoryParam = searchParams.get('category') || '';
    const authorId = searchParams.get('authorId') || '';
    const excludeSlug = searchParams.get('excludeSlug') || '';
    const sort = searchParams.get('sort') || '-createdAt';
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    const query = {};

    if (excludeSlug) query.slug = { $ne: excludeSlug };

    if (categoryParam && categoryParam !== 'All') {
      const cat = await Category.findOne({ name: { $regex: new RegExp(`^${escapeRegex(categoryParam)}$`, 'i') } });
      if (!cat) return NextResponse.json({ total: 0, blogs: [], next: null, previous: null });
      query.category = cat._id;
    }

    if (authorId) {
      query.author = isObjectId(authorId) ? new mongoose.Types.ObjectId(authorId) : authorId;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }

    const sortField = sort === '-views' ? { views: -1 } : { createdAt: -1 };

    const [total, docs] = await Promise.all([
      Blog.countDocuments(query),
      Blog.find(query)
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .populate('author', AUTHOR_SELECT)
        .populate('category', CATEGORY_SELECT)
        .lean(),
    ]);

    const blogs = docs.map(serializeBlog);

    return NextResponse.json({
      total,
      blogs,
      next: skip + limit < total ? `?skip=${skip + limit}&limit=${limit}` : null,
      previous: skip > 0 ? `?skip=${Math.max(0, skip - limit)}&limit=${limit}` : null,
    });
  } catch (err) {
    console.error('GET /blogs error:', err);
    return NextResponse.json({ detail: 'Failed to fetch blogs' }, { status: 500 });
  }
}

// ─── POST /api/v1/blogs ──────────────────────────────────────────────────────

export async function POST(request) {
  try {
    await connectToDatabase();

    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const body = await request.json();

    // Slug generation
    const baseSlug = slugify(body.title || 'untitled');
    let slug = baseSlug;
    let counter = 1;
    while (await Blog.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Build content object from flat fields or nested content
    const content = body.content || {};
    if (body.introduction != null) content.introduction = body.introduction;
    if (body.conclusion != null) content.conclusion = body.conclusion;
    if (body.sections != null) content.sections = body.sections;

    // Resolve category
    let categoryOid = null;
    let categoryName = null;
    if (body.category) {
      const cat = isObjectId(body.category)
        ? await Category.findById(body.category)
        : await Category.findOne({ name: { $regex: new RegExp(`^${escapeRegex(body.category)}$`, 'i') } });
      if (cat) { categoryOid = cat._id; categoryName = cat.name; }
    }

    const now = new Date();
    const doc = await Blog.create({
      title: body.title,
      slug,
      subtitle: body.subtitle,
      excerpt: body.excerpt,
      content,
      thumbnail: body.thumbnail || body.image || '',
      image: body.image || body.thumbnail || '',
      author: new mongoose.Types.ObjectId(user.id),
      category: categoryOid,
      category_name: categoryName,
      tags: body.tags || [],
      featured: body.featured || false,
      is_published: body.is_published !== false,
      views: 0,
      likes: 0,
      publishedDate: body.publishedDate || now,
    });

    // Increment author blog_count
    await User.updateOne({ _id: user.id }, { $inc: { blog_count: 1 } });

    const populated = await Blog.findById(doc._id)
      .populate('author', AUTHOR_SELECT)
      .populate('category', CATEGORY_SELECT)
      .lean();

    // Fire-and-forget embedding (non-blocking)
    embedBlogAsync(doc._id.toString(), request).catch(() => {});

    return NextResponse.json(serializeBlog(populated), { status: 201 });
  } catch (err) {
    console.error('POST /blogs error:', err);
    return NextResponse.json({ detail: `Failed to create blog: ${err.message}` }, { status: 500 });
  }
}

async function embedBlogAsync(blogId, request) {
  try {
    const origin = new URL(request.url).origin;
    await fetch(`${origin}/api/v1/blogs/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blog_id: blogId }),
    });
  } catch { /* silent */ }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
