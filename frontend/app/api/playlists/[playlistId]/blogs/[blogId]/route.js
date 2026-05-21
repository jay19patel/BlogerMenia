import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { playlistId, blogId } = await params;
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

    const blogIndex = pl.blogs.findIndex(b => b.blog_id === blogId || b.slug === blogId);
    if (blogIndex === -1) {
      return NextResponse.json(
        { detail: 'Blog post not found in this playlist.' },
        { status: 404 }
      );
    }

    pl.blogs.splice(blogIndex, 1);
    pl.blog_count = pl.blogs.length;

    // Recalculate views and likes
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
    console.error('Delete blog from playlist API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
