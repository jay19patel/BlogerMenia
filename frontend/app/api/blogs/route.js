import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const categoryName = searchParams.get('category.name') || '';
    const authorId = searchParams.get('author.$id') || searchParams.get('author.id') || searchParams.get('author_id') || '';
    const sort = searchParams.get('sort') || '';

    const db = readDB();

    // Map authors and categories details onto blogs
    let resolvedBlogs = db.blogs.map(blog => {
      const author = db.users.find(u => u.id === blog.author_id);
      const category = db.categories.find(c => c.id === blog.category_id);
      
      const authorProfile = author ? {
        id: author.id,
        email: author.email,
        full_name: author.full_name,
        profile_image: author.profile_image,
        headline: author.headline,
        blog_count: author.blog_count,
        total_views: author.total_views,
        total_likes: author.total_likes
      } : null;

      return {
        ...blog,
        author: authorProfile,
        category: category || { name: 'General', slug: 'general' }
      };
    });

    // 1. Filter by Author
    if (authorId) {
      resolvedBlogs = resolvedBlogs.filter(b => b.author_id === authorId || (b.author && b.author.id === authorId));
    }

    // 2. Filter by Category
    if (categoryName && categoryName !== 'All') {
      resolvedBlogs = resolvedBlogs.filter(b => b.category?.name.toLowerCase() === categoryName.toLowerCase());
    }

    // 3. Filter by Search Query (title, subtitle, excerpt, content body)
    if (search) {
      const term = search.toLowerCase();
      resolvedBlogs = resolvedBlogs.filter(b => {
        const inTitle = b.title?.toLowerCase().includes(term);
        const inSubtitle = b.subtitle?.toLowerCase().includes(term);
        const inExcerpt = b.excerpt?.toLowerCase().includes(term);
        const inIntro = b.content?.introduction?.toLowerCase().includes(term);
        const inConclusion = b.content?.conclusion?.toLowerCase().includes(term);
        
        let inSections = false;
        if (b.content?.sections) {
          inSections = b.content.sections.some(sec => 
            sec.title?.toLowerCase().includes(term) || 
            sec.content?.toLowerCase().includes(term) ||
            (sec.items && sec.items.some(item => item.toLowerCase().includes(term)))
          );
        }

        return inTitle || inSubtitle || inExcerpt || inIntro || inConclusion || inSections;
      });
    }

    // 4. Sort
    if (sort === '-views') {
      resolvedBlogs.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'views') {
      resolvedBlogs.sort((a, b) => (a.views || 0) - (b.views || 0));
    } else {
      // Default sort: newest published first
      resolvedBlogs.sort((a, b) => new Date(b.publishedDate || b.created_at) - new Date(a.publishedDate || a.created_at));
    }

    const total = resolvedBlogs.length;
    const paginatedBlogs = resolvedBlogs.slice(skip, skip + limit);

    // Return hybrid response compatible with DRF results & direct keys
    return NextResponse.json({
      count: total,
      total: total,
      results: paginatedBlogs,
      blogs: paginatedBlogs
    });
  } catch (error) {
    console.error('Fetch blogs API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

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

    const blogPayload = await request.json();
    const { title, subtitle, excerpt, content, category_id, image } = blogPayload;

    if (!title) {
      return NextResponse.json(
        { detail: 'Blog title is required.' },
        { status: 400 }
      );
    }

    const slug = title.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '') + `-${Date.now().toString().slice(-4)}`;

    const newBlog = {
      id: `blog_${Date.now()}`,
      slug: slug,
      title: title,
      subtitle: subtitle || '',
      excerpt: excerpt || subtitle || '',
      content: content || { introduction: '', sections: [], conclusion: '' },
      author_id: user.id,
      category_id: category_id || db.categories[0]?.id || 'cat_devops',
      views: 0,
      likes: 0,
      publishedDate: new Date().toISOString(),
      created_at: new Date().toISOString(),
      thumbnail: null,
      image: image || 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=800',
      featured: false,
      liked_by: []
    };

    db.blogs.push(newBlog);
    
    // Update user blog count
    const userIdx = db.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      db.users[userIdx].blog_count = (db.users[userIdx].blog_count || 0) + 1;
    }

    writeDB(db);

    return NextResponse.json(newBlog, { status: 201 });
  } catch (error) {
    console.error('Create blog API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
