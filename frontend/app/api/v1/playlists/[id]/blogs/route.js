import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { verifyBearerToken, isAdmin } from '@/lib/apiAuth';

function isOid(v) {
  return /^[0-9a-fA-F]{24}$/.test(v || '');
}

export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const pl = await Playlist.findOne(isOid(id) ? { _id: id } : { slug: id });
    if (!pl) return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });

    const ownerId = pl.owner?.toString();
    if (ownerId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ detail: "You don't have permission to modify this playlist" }, { status: 403 });
    }

    const body = await request.json();
    const blogId = body.blog_id || body.id;
    if (!blogId || !isOid(blogId)) {
      return NextResponse.json({ detail: 'Valid blog_id is required' }, { status: 400 });
    }

    const oid = new mongoose.Types.ObjectId(blogId);
    await Playlist.updateOne({ _id: pl._id }, { $addToSet: { blogs: oid } });
    const updated = await Playlist.findById(pl._id).lean();
    await Playlist.updateOne({ _id: pl._id }, { $set: { blog_count: updated.blogs?.length || 0 } });

    const fresh = await Playlist.findById(pl._id)
      .populate('owner', 'full_name username email')
      .populate('blogs', 'title slug thumbnail image excerpt')
      .lean();

    return NextResponse.json({ success: true, playlist: fresh });
  } catch (err) {
    console.error('Add blog to playlist error:', err);
    return NextResponse.json({ detail: 'Failed to add blog to playlist' }, { status: 500 });
  }
}
