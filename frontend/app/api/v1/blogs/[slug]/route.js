import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import User from '@/models/User';
import Category from '@/models/Category';
import { verifyBearerToken, isAdmin } from '@/lib/apiAuth';

const AUTHOR_SELECT = 'full_name username email profile_image headline bio blog_count total_views';
const CATEGORY_SELECT = 'name slug';

function isObjectId(v) {
  return /^[0-9a-fA-F]{24}$/.test(v || '');
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serializeBlog(doc) {
  const obj = doc?.toObject ? doc.toObject() : { ...doc };
  const author = obj.author && typeof obj.author === 'object' && obj.author._id
    ? { id: obj.author._id.toString(), full_name: obj.author.full_name, username: obj.author.username, email: obj.author.email, profile_image: obj.author.profile_image, headline: obj.author.headline }
    : (obj.author ? { id: obj.author.toString() } : null);
  const category = obj.category && typeof obj.category === 'object' && obj.category._id
    ? { id: obj.category._id.toString(), name: obj.category.name, slug: obj.category.slug }
    : null;
  return {
    id: obj._id?.toString() || obj.id,
    slug: obj.slug, title: obj.title, subtitle: obj.subtitle, excerpt: obj.excerpt,
    content: obj.content, thumbnail: obj.thumbnail || obj.image, image: obj.image || obj.thumbnail,
    author, category, category_name: obj.category_name, featured: obj.featured,
    is_published: obj.is_published, views: obj.views, likes: obj.likes, tags: obj.tags || [],
    published_date: obj.publishedDate, publishedDate: obj.publishedDate,
    created_at: obj.createdAt, updated_at: obj.updatedAt,
  };
}

async function findBlog(slug) {
  const query = isObjectId(slug) ? { _id: slug } : { slug };
  return Blog.findOne(query).populate('author', AUTHOR_SELECT).populate('category', CATEGORY_SELECT);
}

// ─── GET /api/v1/blogs/[slug] ────────────────────────────────────────────────

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const trackView = searchParams.get('track_view') !== 'false';

    const blog = await findBlog(slug);
    if (!blog) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    if (trackView) {
      const authorId = blog.author?._id || blog.author;
      await Promise.all([
        Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } }),
        authorId ? User.updateOne({ _id: authorId }, { $inc: { total_views: 1 } }) : Promise.resolve(),
      ]);
      blog.views = (blog.views || 0) + 1;
    }

    return NextResponse.json(serializeBlog(blog));
  } catch (err) {
    console.error('GET blog error:', err);
    return NextResponse.json({ detail: 'Failed to fetch blog' }, { status: 500 });
  }
}

// ─── PATCH /api/v1/blogs/[slug] ──────────────────────────────────────────────

export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug });
    if (!blog) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    const authorId = blog.author?.toString();
    if (authorId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ detail: "You don't have permission to edit this blog" }, { status: 403 });
    }

    const body = await request.json();
    const updateSet = {};

    // Merge content (intro/conclusion/sections can be patched individually)
    const intro = body.introduction ?? undefined;
    const concl = body.conclusion ?? undefined;
    const sects = body.sections ?? undefined;

    if (intro !== undefined || concl !== undefined || sects !== undefined) {
      const existing = blog.content || {};
      updateSet.content = {
        introduction: intro !== undefined ? intro : existing.introduction,
        conclusion: concl !== undefined ? concl : existing.conclusion,
        sections: sects !== undefined ? sects : existing.sections || [],
      };
    } else if (body.content) {
      updateSet.content = body.content;
    }

    // Resolve category if changed
    if (body.category !== undefined && body.category !== null) {
      const cat = isObjectId(body.category)
        ? await Category.findById(body.category)
        : await Category.findOne({ name: { $regex: new RegExp(`^${escapeRegex(body.category)}$`, 'i') } });
      updateSet.category = cat?._id || null;
      updateSet.category_name = cat?.name || null;
    }

    // Copy other updatable fields
    const allowed = ['title', 'subtitle', 'excerpt', 'thumbnail', 'image', 'featured', 'is_published', 'tags', 'publishedDate'];
    for (const k of allowed) {
      if (body[k] !== undefined) updateSet[k] = body[k];
    }

    await Blog.updateOne({ _id: blog._id }, { $set: updateSet });
    const updated = await findBlog(blog.slug);

    // Fire-and-forget re-embedding
    embedBlogAsync(blog._id.toString(), request).catch(() => {});

    return NextResponse.json(serializeBlog(updated));
  } catch (err) {
    console.error('PATCH blog error:', err);
    return NextResponse.json({ detail: 'Failed to update blog' }, { status: 500 });
  }
}

// ─── DELETE /api/v1/blogs/[slug] ─────────────────────────────────────────────

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const blog = await Blog.findOne(isObjectId(slug) ? { _id: slug } : { slug });
    if (!blog) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    const authorId = blog.author?.toString();
    if (authorId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ detail: "You don't have permission to delete this blog" }, { status: 403 });
    }

    await Promise.all([
      Blog.deleteOne({ _id: blog._id }),
      User.updateOne({ _id: authorId }, { $inc: { blog_count: -1 } }),
    ]);

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('DELETE blog error:', err);
    return NextResponse.json({ detail: 'Failed to delete blog' }, { status: 500 });
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
