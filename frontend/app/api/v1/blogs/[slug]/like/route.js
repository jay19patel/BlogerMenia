import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import Like from '@/models/Like';
import { verifyBearerToken } from '@/lib/apiAuth';

export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const isOid = /^[0-9a-fA-F]{24}$/.test(slug);
    const blog = await Blog.findOne(isOid ? { _id: slug } : { slug }).select('_id likes');
    if (!blog) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    const userId = new mongoose.Types.ObjectId(user.id);
    const blogId = blog._id;

    const existing = await Like.findOne({ user: userId, blog: blogId });
    let newCount, hasLiked;

    if (existing) {
      await Like.deleteOne({ _id: existing._id });
      await Blog.updateOne({ _id: blogId }, { $inc: { likes: -1 } });
      const updated = await Blog.findById(blogId).select('likes');
      newCount = Math.max(0, updated?.likes || 0);
      hasLiked = false;
    } else {
      await Like.create({ user: userId, blog: blogId });
      await Blog.updateOne({ _id: blogId }, { $inc: { likes: 1 } });
      const updated = await Blog.findById(blogId).select('likes');
      newCount = Math.max(0, updated?.likes || 0);
      hasLiked = true;
    }

    return NextResponse.json({
      success: true,
      has_liked: hasLiked,
      likes_count: newCount,
      status: hasLiked ? 'liked' : 'unliked',
      total_likes: newCount,
    });
  } catch (err) {
    console.error('Like error:', err);
    return NextResponse.json({ detail: 'Failed to toggle like' }, { status: 500 });
  }
}
