import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { verifyBearerToken, isAdmin } from '@/lib/apiAuth';

const OWNER_SELECT = 'full_name username email profile_image';
const BLOG_SELECT = 'title slug thumbnail image excerpt category_name';

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

function isOid(v) {
  return /^[0-9a-fA-F]{24}$/.test(v || '');
}

async function findPlaylist(id) {
  const query = isOid(id) ? { _id: id } : { slug: id };
  return Playlist.findOne(query).populate('owner', OWNER_SELECT).populate('blogs', BLOG_SELECT);
}

// ─── GET /api/v1/playlists/[id] ─────────────────────────────────────────────

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const trackView = searchParams.get('track_view') !== 'false';

    const pl = await findPlaylist(id);
    if (!pl) return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });

    if (trackView) {
      await Playlist.updateOne({ _id: pl._id }, { $inc: { total_views: 1 } });
      pl.total_views = (pl.total_views || 0) + 1;
    }

    return NextResponse.json(serializePlaylist(pl));
  } catch (err) {
    console.error('GET playlist error:', err);
    return NextResponse.json({ detail: 'Failed to fetch playlist' }, { status: 500 });
  }
}

// ─── PATCH /api/v1/playlists/[id] ───────────────────────────────────────────

export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const pl = await Playlist.findOne(isOid(id) ? { _id: id } : { slug: id });
    if (!pl) return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });

    const ownerId = pl.owner?.toString();
    if (ownerId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ detail: "You don't have permission to edit this playlist" }, { status: 403 });
    }

    const body = await request.json();
    const allowed = ['name', 'description', 'cover_image', 'thumbnail', 'is_public'];
    const updateSet = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updateSet[k] = body[k];
    }

    // Handle blogs array update
    if (body.blogs !== undefined) {
      const blogs = (body.blogs || [])
        .filter((id) => isOid(String(id)))
        .map((id) => new mongoose.Types.ObjectId(id));
      updateSet.blogs = blogs;
      updateSet.blog_count = blogs.length;
    }

    await Playlist.updateOne({ _id: pl._id }, { $set: updateSet });
    const updated = await findPlaylist(pl.slug || id);
    return NextResponse.json(serializePlaylist(updated));
  } catch (err) {
    console.error('PATCH playlist error:', err);
    return NextResponse.json({ detail: 'Failed to update playlist' }, { status: 500 });
  }
}

// ─── DELETE /api/v1/playlists/[id] ──────────────────────────────────────────

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const pl = await Playlist.findOne(isOid(id) ? { _id: id } : { slug: id });
    if (!pl) return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });

    const ownerId = pl.owner?.toString();
    if (ownerId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ detail: "You don't have permission to delete this playlist" }, { status: 403 });
    }

    await Playlist.deleteOne({ _id: pl._id });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('DELETE playlist error:', err);
    return NextResponse.json({ detail: 'Failed to delete playlist' }, { status: 500 });
  }
}
