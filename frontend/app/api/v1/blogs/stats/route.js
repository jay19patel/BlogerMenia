import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import User from '@/models/User';

export async function GET() {
  try {
    await connectToDatabase();

    const [totalBlogs, viewsAgg, totalAuthors] = await Promise.all([
      Blog.countDocuments({ is_published: true }),
      Blog.aggregate([
        { $match: { is_published: true } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } },
      ]),
      User.countDocuments({}),
    ]);

    return NextResponse.json({
      total_blogs: totalBlogs,
      total_views: viewsAgg[0]?.totalViews || 0,
      total_authors: totalAuthors,
    });
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json({ detail: 'Failed to fetch stats' }, { status: 500 });
  }
}
