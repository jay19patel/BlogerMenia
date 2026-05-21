import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const authHeader = request.headers.get('Authorization');
    const decoded = verifyToken(authHeader);

    if (!decoded) {
      return NextResponse.json(
        { detail: 'Given token not valid or expired.' },
        { status: 401 }
      );
    }

    const db = readDB();
    const blogIndex = db.blogs.findIndex(b => b.slug === slug || b.id === slug);

    if (blogIndex === -1) {
      return NextResponse.json(
        { detail: 'Blog post not found.' },
        { status: 404 }
      );
    }

    const blog = db.blogs[blogIndex];
    const userEmail = decoded.email.toLowerCase();

    // Ensure liked_by array is initialized
    if (!blog.liked_by) {
      blog.liked_by = [];
    }

    const userLikedIndex = blog.liked_by.indexOf(userEmail);
    let status = '';

    const authorIndex = db.users.findIndex(u => u.id === blog.author_id);

    if (userLikedIndex !== -1) {
      // Toggle off: unlike the blog
      blog.liked_by.splice(userLikedIndex, 1);
      blog.likes = Math.max(0, (blog.likes || 1) - 1);
      status = 'unliked';

      // Decrement cumulative likes for the author
      if (authorIndex !== -1) {
        db.users[authorIndex].total_likes = Math.max(0, (db.users[authorIndex].total_likes || 1) - 1);
      }
    } else {
      // Toggle on: like the blog
      blog.liked_by.push(userEmail);
      blog.likes = (blog.likes || 0) + 1;
      status = 'liked';

      // Increment cumulative likes for the author
      if (authorIndex !== -1) {
        db.users[authorIndex].total_likes = (db.users[authorIndex].total_likes || 0) + 1;
      }
    }

    db.blogs[blogIndex] = blog;
    writeDB(db);

    return NextResponse.json({
      status: status,
      total_likes: blog.likes,
      is_liked: status === 'liked'
    });
  } catch (error) {
    console.error('Like blog API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
