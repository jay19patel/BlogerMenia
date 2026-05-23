import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import Blog from '@/models/Blog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function isObjectId(str) {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

export async function POST(req, { params }) {
  try {
    const { playlistId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    if (!data.blog_id) {
      return NextResponse.json({ detail: 'blog_id is required' }, { status: 400 });
    }

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

    const blog = await Blog.findById(data.blog_id);
    if (!blog) {
      return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });
    }

    const alreadyInPlaylist = playlist.blogs.some(id => id.toString() === blog._id.toString());
    if (!alreadyInPlaylist) {
      playlist.blogs.push(blog._id);
      playlist.blog_count = playlist.blogs.length;
      await playlist.save();
    }

    return NextResponse.json({ success: true, message: 'Blog added to playlist' });
  } catch (error) {
    console.error('POST Playlist Blog error:', error);
    return NextResponse.json({ detail: 'Failed to add blog to playlist' }, { status: 500 });
  }
}
