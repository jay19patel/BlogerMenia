import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function isObjectId(str) {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

function normalisePlaylist(doc) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : doc;
  return {
    ...obj,
    id: obj._id?.toString(),
    blogs: (obj.blogs || []).map(blog =>
      typeof blog === 'object' && blog !== null
        ? { ...blog, id: blog._id?.toString() }
        : blog
    ),
  };
}

async function findPlaylist(playlistId) {
  if (isObjectId(playlistId)) {
    return Playlist.findById(playlistId);
  }
  return Playlist.findOne({ slug: playlistId });
}

export async function GET(req, { params }) {
  try {
    const { playlistId } = await params;
    await connectToDatabase();

    const playlist = await (isObjectId(playlistId)
      ? Playlist.findById(playlistId)
      : Playlist.findOne({ slug: playlistId })
    )
      .populate('owner', 'full_name username profile_image')
      .populate({
        path: 'blogs',
        populate: { path: 'author', select: 'full_name username' },
      });

    if (!playlist) {
      return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });
    }

    // Increment total_views
    playlist.total_views = (playlist.total_views || 0) + 1;
    await playlist.save();

    return NextResponse.json(normalisePlaylist(playlist));
  } catch (error) {
    console.error('GET Playlist error:', error);
    return NextResponse.json({ detail: 'Failed to fetch playlist' }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { playlistId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    const playlist = await findPlaylist(playlistId);
    if (!playlist) {
      return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.owner.toString() !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json(
        { detail: "Forbidden: You don't have permission to edit this playlist" },
        { status: 403 }
      );
    }

    // Accept both 'thumbnail' and 'cover_image' from client
    const updatePayload = { ...data };
    if (data.thumbnail !== undefined && data.cover_image === undefined) {
      updatePayload.cover_image = data.thumbnail;
      delete updatePayload.thumbnail;
    }

    // Remove client-side fields that shouldn't overwrite server fields
    delete updatePayload._id;
    delete updatePayload.owner;
    delete updatePayload.slug; // Prevent accidental slug change via PATCH unless intentional

    // If client explicitly sends a slug, allow it
    if (data.slug !== undefined) {
      updatePayload.slug = data.slug;
    }

    // Filter blogs to valid ObjectIds only
    if (Array.isArray(updatePayload.blogs)) {
      updatePayload.blogs = updatePayload.blogs.filter(
        id => id && String(id).match(/^[0-9a-fA-F]{24}$/)
      );
    }

    const updated = await Playlist.findByIdAndUpdate(
      playlist._id,
      { $set: updatePayload },
      { new: true }
    )
      .populate('owner', 'full_name username profile_image')
      .populate('blogs', 'title slug thumbnail views');

    return NextResponse.json(normalisePlaylist(updated));
  } catch (error) {
    console.error('PATCH Playlist error:', error);
    return NextResponse.json(
      { detail: 'Failed to update playlist. ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { playlistId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const playlist = await findPlaylist(playlistId);
    if (!playlist) {
      return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.owner.toString() !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json(
        { detail: "Forbidden: You don't have permission to delete this playlist" },
        { status: 403 }
      );
    }

    await Playlist.findByIdAndDelete(playlist._id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE Playlist error:', error);
    return NextResponse.json({ detail: 'Failed to delete playlist' }, { status: 500 });
  }
}
