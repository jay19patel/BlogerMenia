import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { verifyBearerToken } from '@/lib/apiAuth';

const OWNER_SELECT = 'full_name username email profile_image';
const BLOG_SELECT = 'title slug thumbnail image excerpt category_name';

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function serializePlaylist(doc) {
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

// ─── GET /api/v1/playlists ───────────────────────────────────────────────────

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const ownerId = searchParams.get('ownerId') || '';
    const isPublicParam = searchParams.get('is_public');
    const blogId = searchParams.get('blogId') || '';
    const sort = searchParams.get('sort') || '-createdAt';
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    const query = {};

    if (isPublicParam === 'true') query.is_public = true;
    if (ownerId) query.owner = /^[0-9a-fA-F]{24}$/.test(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId;
    if (blogId) query.blogs = /^[0-9a-fA-F]{24}$/.test(blogId) ? new mongoose.Types.ObjectId(blogId) : blogId;
    if (search) query.name = { $regex: search, $options: 'i' };

    const sortField = sort === '-views' ? { total_views: -1 } : { createdAt: -1 };

    const [total, docs] = await Promise.all([
      Playlist.countDocuments(query),
      Playlist.find(query)
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .populate('owner', OWNER_SELECT)
        .populate('blogs', BLOG_SELECT)
        .lean(),
    ]);

    return NextResponse.json({
      total,
      playlists: docs.map(serializePlaylist),
      results: docs.map(serializePlaylist),
      next: skip + limit < total ? `?skip=${skip + limit}&limit=${limit}` : null,
      previous: skip > 0 ? `?skip=${Math.max(0, skip - limit)}&limit=${limit}` : null,
    });
  } catch (err) {
    console.error('GET playlists error:', err);
    return NextResponse.json({ detail: 'Failed to fetch playlists' }, { status: 500 });
  }
}

// ─── POST /api/v1/playlists ──────────────────────────────────────────────────

export async function POST(request) {
  try {
    await connectToDatabase();
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ detail: 'Playlist name is required' }, { status: 400 });
    }

    // Slug
    const baseSlug = body.slug?.trim() || slugify(body.name);
    let slug = baseSlug;
    let counter = 1;
    while (await Playlist.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Resolve blogs array
    const blogs = (body.blogs || [])
      .filter((id) => /^[0-9a-fA-F]{24}$/.test(String(id)))
      .map((id) => new mongoose.Types.ObjectId(id));

    const doc = await Playlist.create({
      name: body.name.trim(),
      slug,
      description: body.description || '',
      cover_image: body.cover_image || body.thumbnail || '',
      thumbnail: body.thumbnail || body.cover_image || '',
      is_public: body.is_public !== false,
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

    return NextResponse.json(serializePlaylist(populated), { status: 201 });
  } catch (err) {
    console.error('POST playlists error:', err);
    return NextResponse.json({ detail: `Failed to create playlist: ${err.message}` }, { status: 500 });
  }
}
