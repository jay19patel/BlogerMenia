import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Bookmark from '@/models/Bookmark';
import { verifyBearerToken } from '@/lib/apiAuth';

export async function GET(request) {
  try {
    await connectToDatabase();
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const userId = new mongoose.Types.ObjectId(user.id);

    const pipeline = [
      { $match: { user: userId } },
      { $sort: { updatedAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'blogs',
          localField: 'blog',
          foreignField: '_id',
          as: 'blog',
        },
      },
      { $unwind: { path: '$blog', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'users',
          localField: 'blog.author',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
    ];

    const db = mongoose.connection.db;
    const docs = await db.collection('bookmarks').aggregate(pipeline).toArray();

    const result = docs.map((raw) => ({
      id: raw._id?.toString(),
      blog_id: raw.blog?._id?.toString(),
      section_id: raw.section_id,
      section_title: raw.section_title,
      created_at: raw.createdAt,
      updated_at: raw.updatedAt,
      blog_slug: raw.blog?.slug,
      blog_title: raw.blog?.title,
      blog_thumbnail: raw.blog?.thumbnail || raw.blog?.image,
      blog_excerpt: raw.blog?.excerpt,
      blog_category: raw.blog?.category_name,
      author_email: raw.author?.email,
      author_username: raw.author?.username,
      author_full_name: raw.author?.full_name,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('Bookmarks list error:', err);
    return NextResponse.json({ detail: 'Failed to fetch bookmarks' }, { status: 500 });
  }
}
