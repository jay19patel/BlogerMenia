import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Sort users by blog_count and total_views
    const topAuthors = await User.find({})
      .select('full_name username email profile_image headline bio blog_count total_views')
      .sort({ total_views: -1, blog_count: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      count: topAuthors.length,
      users: topAuthors
    });
  } catch (error) {
    console.error("GET Top Authors error:", error);
    return NextResponse.json({ detail: "Failed to fetch top authors" }, { status: 500 });
  }
}
