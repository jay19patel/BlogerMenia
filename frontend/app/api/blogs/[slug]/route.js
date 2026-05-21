import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const trackView = searchParams.get('track_view') !== 'false';

    const db = readDB();
    const blogIndex = db.blogs.findIndex(b => b.slug === slug || b.id === slug);

    if (blogIndex === -1) {
      return NextResponse.json(
        { detail: 'Blog post not found.' },
        { status: 404 }
      );
    }

    const blog = db.blogs[blogIndex];

    // Dynamic view counter incrementing
    if (trackView) {
      blog.views = (blog.views || 0) + 1;
      db.blogs[blogIndex] = blog;
      
      // Update cumulative total views for the author
      const authorIndex = db.users.findIndex(u => u.id === blog.author_id);
      if (authorIndex !== -1) {
        db.users[authorIndex].total_views = (db.users[authorIndex].total_views || 0) + 1;
      }
      
      writeDB(db);
    }

    // Resolve author and category full details
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

    const resolvedBlog = {
      ...blog,
      author: authorProfile,
      category: category || { name: 'General', slug: 'general' }
    };

    return NextResponse.json(resolvedBlog);
  } catch (error) {
    console.error('Fetch single blog API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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

    // Restrict updates to the original author
    if (blog.author_id !== decoded.id) {
      return NextResponse.json(
        { detail: 'You are not authorized to update this blog.' },
        { status: 403 }
      );
    }

    const updateData = await request.json();

    if (updateData.title !== undefined) blog.title = updateData.title;
    if (updateData.subtitle !== undefined) blog.subtitle = updateData.subtitle;
    if (updateData.excerpt !== undefined) blog.excerpt = updateData.excerpt;
    if (updateData.content !== undefined) blog.content = updateData.content;
    if (updateData.category_id !== undefined) blog.category_id = updateData.category_id;
    if (updateData.image !== undefined) blog.image = updateData.image;
    if (updateData.featured !== undefined) blog.featured = updateData.featured;

    db.blogs[blogIndex] = blog;
    writeDB(db);

    return NextResponse.json(blog);
  } catch (error) {
    console.error('Update blog API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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

    // Restrict delete to the original author or admin
    if (blog.author_id !== decoded.id && decoded.id !== 'usr_admin') {
      return NextResponse.json(
        { detail: 'You are not authorized to delete this blog.' },
        { status: 403 }
      );
    }

    // Remove the blog post
    db.blogs.splice(blogIndex, 1);

    // Decrement author blog count
    const authorIndex = db.users.findIndex(u => u.id === blog.author_id);
    if (authorIndex !== -1) {
      db.users[authorIndex].blog_count = Math.max(0, (db.users[authorIndex].blog_count || 1) - 1);
    }

    writeDB(db);

    return new Response(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error('Delete blog API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
