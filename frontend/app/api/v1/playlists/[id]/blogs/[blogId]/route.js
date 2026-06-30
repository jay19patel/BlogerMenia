import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { verifyBearerToken, isAdmin } from '@/lib/apiAuth';

function isOid(v) {
  return /^[0-9a-fA-F]{24}$/.test(v || '');
}

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id, blogId } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const pl = await Playlist.findOne(isOid(id) ? { _id: id } : { slug: id });
    if (!pl) return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });

    const ownerId = pl.owner?.toString();
    if (ownerId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ detail: "You don't have permission to modify this playlist" }, { status: 403 });
    }

    const oid = isOid(blogId) ? new mongoose.Types.ObjectId(blogId) : null;
    if (!oid) return NextResponse.json({ detail: 'Invalid blog ID' }, { status: 400 });

    await Playlist.updateOne({ _id: pl._id }, { $pull: { blogs: oid } });
    const updated = await Playlist.findById(pl._id).lean();
    await Playlist.updateOne({ _id: pl._id }, { $set: { blog_count: updated.blogs?.length || 0 } });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('Remove blog from playlist error:', err);
    return NextResponse.json({ detail: 'Failed to remove blog from playlist' }, { status: 500 });
  }
}
