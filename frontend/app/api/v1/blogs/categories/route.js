import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Category from '@/models/Category';
import Blog from '@/models/Blog';
import User from '@/models/User';

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (username) {
      // Find user, then return only categories used by that user's blogs
      const user = await User.findOne({
        $or: [{ email: username }, { username }],
      }).select('_id');

      if (!user) return NextResponse.json([]);

      const categoryIds = await Blog.distinct('category', { author: user._id, is_published: true });
      const cats = await Category.find({ _id: { $in: categoryIds } }).sort({ name: 1 }).lean();
      return NextResponse.json(cats.map(serializeCat));
    }

    const cats = await Category.find({}).sort({ name: 1 }).lean();
    return NextResponse.json(cats.map(serializeCat));
  } catch (err) {
    console.error('Categories GET error:', err);
    return NextResponse.json({ detail: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const { name, slug: slugInput } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ detail: 'Category name is required' }, { status: 400 });
    }

    const trimmed = name.trim();
    const slug = slugInput?.trim() || trimmed.toLowerCase()
      .replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

    const cat = await Category.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') } },
      { $setOnInsert: { name: trimmed, slug } },
      { upsert: true, new: true, lean: true },
    );

    return NextResponse.json(serializeCat(cat));
  } catch (err) {
    console.error('Category POST error:', err);
    return NextResponse.json({ detail: 'Failed to create category' }, { status: 500 });
  }
}

function serializeCat(c) {
  return { id: c._id.toString(), name: c.name, slug: c.slug };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
