import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';
import User from '@/models/User';
import Category from '@/models/Category';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function normaliseBlog(blog) {
  if (!blog) return blog;
  return {
    ...blog,
    id: blog._id?.toString(),
    author: blog.author && typeof blog.author === 'object'
      ? { ...blog.author, id: blog.author._id?.toString() }
      : blog.author,
  };
}

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get('skip')) || 0;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const categoryName = searchParams.get('category') || '';
    const authorId = searchParams.get('authorId') || '';
    const sort = searchParams.get('sort') || '-createdAt';
    const excludeSlug = searchParams.get('excludeSlug') || '';

    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }

    if (excludeSlug) {
      query.slug = { $ne: excludeSlug };
    }

    // Category filter
    if (categoryName && categoryName !== 'All') {
      const category = await Category.findOne({
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
      });
      if (category) {
        query.category = category._id;
      } else {
        return NextResponse.json({ total: 0, blogs: [], next: null, previous: null });
      }
    }

    // Author filter — owner sees all their own blogs, others see published only
    if (authorId) {
      query.author = authorId;
    }

    // Sorting — use schema field names (timestamps: true creates 'createdAt')
    let sortOptions = {};
    if (sort === '-views') {
      sortOptions.views = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const total = await Blog.countDocuments(query);
    const blogs = await Blog.find(query)
      .populate('author', 'full_name username email profile_image')
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      total,
      blogs: blogs.map(normaliseBlog),
      next: skip + limit < total
        ? `${req.nextUrl.pathname}?skip=${skip + limit}&limit=${limit}`
        : null,
      previous: skip > 0
        ? `${req.nextUrl.pathname}?skip=${Math.max(0, skip - limit)}&limit=${limit}`
        : null,
    });
  } catch (error) {
    console.error('GET Blogs error:', error);
    return NextResponse.json({ detail: 'Failed to fetch blogs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    if (!data.title) {
      return NextResponse.json({ detail: 'Title is required' }, { status: 400 });
    }

    // Ensure unique slug
    let baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await Blog.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Build content object from flat fields
    const contentObj = {
      introduction: data.introduction,
      conclusion: data.conclusion,
      sections: data.sections || [],
    };
    delete data.introduction;
    delete data.conclusion;
    delete data.sections;

    const newBlog = await Blog.create({
      ...data,
      slug,
      content: contentObj,
      author: session.user.id,
      publishedDate: new Date(),
    });

    // Increment author blog count
    await User.findByIdAndUpdate(session.user.id, { $inc: { blog_count: 1 } });

    const populated = await Blog.findById(newBlog._id)
      .populate('author', 'full_name username email profile_image')
      .populate('category', 'name slug')
      .lean();

    return NextResponse.json(normaliseBlog(populated), { status: 201 });
  } catch (error) {
    console.error('POST Blog error:', error);
    return NextResponse.json(
      { detail: 'Failed to create blog. ' + error.message },
      { status: 500 }
    );
  }
}
