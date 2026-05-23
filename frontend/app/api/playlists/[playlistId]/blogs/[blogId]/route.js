import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function isObjectId(str) {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

export async function DELETE(req, { params }) {
  try {
    const { playlistId, blogId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const playlist = isObjectId(playlistId)
      ? await Playlist.findById(playlistId)
      : await Playlist.findOne({ slug: playlistId });

    if (!playlist) {
      return NextResponse.json({ detail: 'Playlist not found' }, { status: 404 });
    }

    if (playlist.owner.toString() !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json(
        { detail: "Forbidden: You don't have permission to modify this playlist" },
        { status: 403 }
      );
    }

    playlist.blogs = playlist.blogs.filter(id => id.toString() !== blogId);
    playlist.blog_count = playlist.blogs.length;
    await playlist.save();

    return NextResponse.json({ success: true, message: 'Blog removed from playlist' });
  } catch (error) {
    console.error('DELETE Playlist Blog error:', error);
    return NextResponse.json({ detail: 'Failed to remove blog from playlist' }, { status: 500 });
  }
}
