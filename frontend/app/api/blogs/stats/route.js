import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import User from '@/models/User';

export async function GET() {
  try {
    await connectToDatabase();

    const totalBlogs = await Blog.countDocuments({ is_published: true });

    // Sum all views across all blogs
    const viewResult = await Blog.aggregate([
      { $match: { is_published: true } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]);
    const totalViews = viewResult.length > 0 ? viewResult[0].totalViews : 0;

    const totalAuthors = await User.countDocuments();

    return NextResponse.json({
      total_blogs: totalBlogs,
      total_views: totalViews,
      total_authors: totalAuthors
    });
  } catch (error) {
    console.error("GET Stats error:", error);
    return NextResponse.json({ detail: "Failed to fetch stats" }, { status: 500 });
  }
}
