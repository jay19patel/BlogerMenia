import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Like from '@/models/Like';
import { verifyBearerToken } from '@/lib/apiAuth';

export async function GET(request) {
  try {
    await connectToDatabase();
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100')));

    const likes = await Like.find({ user: new mongoose.Types.ObjectId(user.id) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('blog');

    return NextResponse.json({ blog_ids: likes.map((l) => l.blog.toString()) });
  } catch (err) {
    console.error('Likes list error:', err);
    return NextResponse.json({ detail: 'Failed to fetch likes' }, { status: 500 });
  }
}
