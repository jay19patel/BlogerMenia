import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Blog from '@/models/Blog';

const AUTHOR_SELECT = 'full_name username email profile_image headline';
const CATEGORY_SELECT = 'name slug';

function serializeBlog(doc) {
  const obj = doc?.toObject ? doc.toObject() : { ...doc };
  const author = obj.author && typeof obj.author === 'object' && obj.author._id
    ? { id: obj.author._id.toString(), full_name: obj.author.full_name, username: obj.author.username, email: obj.author.email, profile_image: obj.author.profile_image }
    : null;
  const category = obj.category && typeof obj.category === 'object' && obj.category._id
    ? { id: obj.category._id.toString(), name: obj.category.name, slug: obj.category.slug }
    : null;
  return {
    id: obj._id?.toString(), slug: obj.slug, title: obj.title, excerpt: obj.excerpt,
    thumbnail: obj.thumbnail || obj.image, image: obj.image || obj.thumbnail,
    author, category, category_name: obj.category_name, featured: obj.featured,
    views: obj.views, likes: obj.likes, tags: obj.tags || [],
    published_date: obj.publishedDate, created_at: obj.createdAt,
  };
}

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '4')));

    const isOid = /^[0-9a-fA-F]{24}$/.test(slug);
    const source = await Blog.findOne(isOid ? { _id: slug } : { slug }).select('_id slug category');
    if (!source) return NextResponse.json({ detail: 'Blog not found' }, { status: 404 });

    // Try same-category first, then recency fallback
    const query = { slug: { $ne: source.slug }, is_published: true };
    if (source.category) query.category = source.category;

    let docs = await Blog.find(query)
      .sort({ views: -1, createdAt: -1 })
      .limit(limit)
      .populate('author', AUTHOR_SELECT)
      .populate('category', CATEGORY_SELECT)
      .lean();

    if (docs.length < limit) {
      // Pad with recent blogs from other categories
      const existingIds = docs.map(d => d._id.toString());
      const extra = await Blog.find({
        slug: { $ne: source.slug },
        is_published: true,
        _id: { $nin: docs.map(d => d._id) },
      })
        .sort({ createdAt: -1 })
        .limit(limit - docs.length)
        .populate('author', AUTHOR_SELECT)
        .populate('category', CATEGORY_SELECT)
        .lean();
      docs = [...docs, ...extra];
    }

    return NextResponse.json(docs.map(serializeBlog));
  } catch (err) {
    console.error('Related blogs error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
