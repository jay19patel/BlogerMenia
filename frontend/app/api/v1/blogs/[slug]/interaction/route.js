import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import Like from '@/models/Like';
import Bookmark from '@/models/Bookmark';
import { verifyBearerToken } from '@/lib/apiAuth';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const isOid = /^[0-9a-fA-F]{24}$/.test(slug);
    const blog = await Blog.findOne(isOid ? { _id: slug } : { slug }).select('_id');
    if (!blog) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    const userId = new mongoose.Types.ObjectId(user.id);
    const [likeDoc, bookmarkDoc] = await Promise.all([
      Like.findOne({ user: userId, blog: blog._id }).select('_id'),
      Bookmark.findOne({ user: userId, blog: blog._id }),
    ]);

    const bookmark = bookmarkDoc
      ? {
          id: bookmarkDoc._id.toString(),
          blog_id: blog._id.toString(),
          section_id: bookmarkDoc.section_id,
          section_title: bookmarkDoc.section_title,
          created_at: bookmarkDoc.createdAt,
          updated_at: bookmarkDoc.updatedAt,
        }
      : null;

    return NextResponse.json({ has_liked: !!likeDoc, bookmark });
  } catch (err) {
    console.error('Interaction error:', err);
    return NextResponse.json({ detail: 'Failed to fetch interaction' }, { status: 500 });
  }
}
