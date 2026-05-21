import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';

export async function GET() {
  try {
    const db = readDB();
    
    const activeUsers = db.users.filter(u => u.is_active).length;
    const blogsPublished = db.blogs.length;
    const totalViews = db.blogs.reduce((sum, blog) => sum + (blog.views || 0), 0);

    return NextResponse.json({
      active_users: activeUsers,
      blogs_published: blogsPublished,
      total_views: totalViews
    });
  } catch (error) {
    console.error('Fetch stats API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
