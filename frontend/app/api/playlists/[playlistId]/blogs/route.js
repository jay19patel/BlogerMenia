import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const { playlistId } = await params;
    const authHeader = request.headers.get('Authorization');
    const decoded = verifyToken(authHeader);

    if (!decoded) {
      return NextResponse.json(
        { detail: 'Given token not valid or expired.' },
        { status: 401 }
      );
    }

    const db = readDB();
    const plIndex = db.playlists.findIndex(p => p.id === playlistId || p.slug === playlistId);

    if (plIndex === -1) {
      return NextResponse.json(
        { detail: 'Playlist not found.' },
        { status: 404 }
      );
    }

    const pl = db.playlists[plIndex];

    if (pl.owner_id !== decoded.id) {
      return NextResponse.json(
        { detail: 'You are not authorized to edit this playlist.' },
        { status: 403 }
      );
    }

    const blogData = await request.json();
    const blogId = blogData.blog_id || blogData.id || blogData._id;

    if (!blogId) {
      return NextResponse.json(
        { detail: 'Blog ID is required.' },
        { status: 400 }
      );
    }

    // Check if the blog already exists in the playlist
    const exists = pl.blogs.some(b => (b.blog_id === blogId || b.id === blogId));
    if (exists) {
      return NextResponse.json(
        { detail: 'This blog post is already in this playlist.' },
        { status: 400 }
      );
    }

    // Fetch full blog details to populate values accurately
    const originalBlog = db.blogs.find(b => b.id === blogId || b.slug === blogData.slug);
    
    const newBlogEntry = {
      blog_id: blogId,
      slug: originalBlog ? originalBlog.slug : (blogData.slug || ''),
      title: originalBlog ? originalBlog.title : (blogData.title || 'Untitled'),
      image: originalBlog ? originalBlog.image : (blogData.image || ''),
      excerpt: originalBlog ? originalBlog.excerpt : (blogData.excerpt || '')
    };

    pl.blogs.push(newBlogEntry);
    pl.blog_count = pl.blogs.length;

    // Recompute total views and likes for the playlist based on members
    let totalViews = 0;
    let totalLikes = 0;
    pl.blogs.forEach(b => {
      const dbBlog = db.blogs.find(ob => ob.id === b.blog_id || ob.slug === b.slug);
      if (dbBlog) {
        totalViews += (dbBlog.views || 0);
        totalLikes += (dbBlog.likes || 0);
      }
    });
    pl.total_views = totalViews;
    pl.total_likes = totalLikes;

    db.playlists[plIndex] = pl;
    writeDB(db);

    return NextResponse.json(pl);
  } catch (error) {
    console.error('Add blog to playlist API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
