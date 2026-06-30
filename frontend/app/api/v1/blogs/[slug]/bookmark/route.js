import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import Bookmark from '@/models/Bookmark';
import { verifyBearerToken } from '@/lib/apiAuth';

async function getBlogId(slug) {
  const isOid = /^[0-9a-fA-F]{24}$/.test(slug);
  const blog = await Blog.findOne(isOid ? { _id: slug } : { slug }).select('_id');
  return blog?._id || null;
}

export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const blogId = await getBlogId(slug);
    if (!blogId) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    const { section_id, section_title } = await request.json();
    const userId = new mongoose.Types.ObjectId(user.id);
    const now = new Date();

    const doc = await Bookmark.findOneAndUpdate(
      { user: userId, blog: blogId },
      { $set: { section_id, section_title, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true, new: true },
    );

    return NextResponse.json({
      id: doc._id.toString(),
      blog_id: blogId.toString(),
      section_id: doc.section_id,
      section_title: doc.section_title,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    });
  } catch (err) {
    console.error('Bookmark POST error:', err);
    return NextResponse.json({ detail: 'Failed to save bookmark' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const blogId = await getBlogId(slug);
    if (!blogId) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    await Bookmark.deleteOne({ user: new mongoose.Types.ObjectId(user.id), blog: blogId });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('Bookmark DELETE error:', err);
    return NextResponse.json({ detail: 'Failed to delete bookmark' }, { status: 500 });
  }
}
