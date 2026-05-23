import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Category from '@/models/Category';
import Blog from '@/models/Blog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    
    let categories;
    
    if (username) {
      // Find all categories used by this specific user
      // First find all blogs by this user
      // Wait, we can just aggregate or fetch blogs and extract categories
      const mongoose = require('mongoose');
      const User = mongoose.models.User;
      
      const user = await User.findOne({ 
        $or: [
          { username: username },
          { email: username }
        ] 
      });
      if (!user) {
        return NextResponse.json({ detail: "User not found" }, { status: 404 });
      }
      
      const distinctCategoryIds = await Blog.distinct('category', { author: user._id, is_published: true });
      categories = await Category.find({ _id: { $in: distinctCategoryIds } }).sort({ name: 1 });
    } else {
      categories = await Category.find().sort({ name: 1 });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET Categories error:", error);
    return NextResponse.json({ detail: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    if (!data.name) {
      return NextResponse.json({ detail: "Category name is required" }, { status: 400 });
    }

    let slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Check if exists
    let existing = await Category.findOne({ name: new RegExp(`^${data.name}$`, 'i') });
    if (existing) {
      return NextResponse.json(existing, { status: 200 }); // Return existing
    }

    const newCategory = await Category.create({ name: data.name, slug });
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("POST Category error:", error);
    // If duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({ detail: "Category already exists" }, { status: 400 });
    }
    return NextResponse.json({ detail: "Failed to create category. " + error.message }, { status: 500 });
  }
}
