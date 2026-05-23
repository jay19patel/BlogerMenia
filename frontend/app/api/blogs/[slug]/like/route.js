import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req, { params }) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    // We treat 'slug' as the blogId here, but it could be the slug or ID.
    // For liking, frontend usually passes ID or slug.
    let blog;
    if (slug.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(slug);
    } else {
      blog = await Blog.findOne({ slug });
    }
    if (!blog) {
      return NextResponse.json({ detail: "Blog not found" }, { status: 404 });
    }

    const userId = session.user.id;

    // Check if user already liked
    const hasLiked = blog.likes && blog.likes.includes(userId);

    if (hasLiked) {
      // Unlike
      blog.likes = blog.likes.filter(id => id.toString() !== userId);
    } else {
      // Like
      if (!blog.likes) blog.likes = [];
      blog.likes.push(userId);
    }

    await blog.save();

    return NextResponse.json({
      success: true,
      likes_count: blog.likes.length,
      has_liked: !hasLiked
    });
  } catch (error) {
    console.error("Like Blog error:", error);
    return NextResponse.json({ detail: "Failed to like blog" }, { status: 500 });
  }
}
