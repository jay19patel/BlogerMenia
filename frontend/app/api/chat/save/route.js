import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const decoded = verifyToken(authHeader);

    if (!decoded) {
      return NextResponse.json(
        { detail: 'Given token not valid or expired.' },
        { status: 401 }
      );
    }

    const db = readDB();
    const user = db.users.find(u => u.id === decoded.id);

    if (!user) {
      return NextResponse.json(
        { detail: 'User session not found.' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    
    // Validate draft format
    if (!payload.title || !payload.content) {
      return NextResponse.json(
        { detail: 'Draft payload must contain a title and content.' },
        { status: 400 }
      );
    }

    const slug = payload.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;

    const newBlog = {
      id: `blog_${Date.now()}`,
      slug: slug,
      title: payload.title,
      subtitle: payload.subtitle || '',
      excerpt: payload.excerpt || '',
      content: payload.content, // Should be the structured object from our AI logic
      author_id: user.id,
      category_id: payload.category_id || db.categories[0].id,
      views: 0,
      likes: 0,
      publishedDate: new Date().toISOString(),
      created_at: new Date().toISOString(),
      thumbnail: payload.thumbnail || null,
      image: payload.image || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
      featured: false,
      liked_by: []
    };

    db.blogs.push(newBlog);
    
    // Update user stats
    user.blog_count = (user.blog_count || 0) + 1;
    
    writeDB(db);

    return NextResponse.json(newBlog, { status: 201 });
  } catch (error) {
    console.error('Chat save draft API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
