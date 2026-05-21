import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get('is_public') === 'true';
    const ownerId = searchParams.get('owner.$id') || searchParams.get('owner.id') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const db = readDB();
    let resolvedPlaylists = db.playlists.map(pl => {
      const owner = db.users.find(u => u.id === pl.owner_id);
      return {
        ...pl,
        owner: owner ? {
          id: owner.id,
          email: owner.email,
          full_name: owner.full_name,
          username: owner.email.split('@')[0]
        } : null
      };
    });

    // 1. Filter by Public
    if (isPublic) {
      resolvedPlaylists = resolvedPlaylists.filter(pl => pl.is_public);
    }

    // 2. Filter by Owner
    if (ownerId) {
      resolvedPlaylists = resolvedPlaylists.filter(pl => pl.owner_id === ownerId || (pl.owner && pl.owner.id === ownerId));
    }

    // 3. Search filter
    if (search) {
      const term = search.toLowerCase();
      resolvedPlaylists = resolvedPlaylists.filter(pl => 
        pl.name?.toLowerCase().includes(term) || 
        pl.description?.toLowerCase().includes(term)
      );
    }

    const total = resolvedPlaylists.length;
    const paginated = resolvedPlaylists.slice(skip, skip + limit);

    return NextResponse.json({
      count: total,
      total: total,
      results: paginated,
      playlists: paginated
    });
  } catch (error) {
    console.error('Fetch playlists API error:', error);
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

    const { name, description, is_public, thumbnail } = await request.json();

    if (!name) {
      return NextResponse.json(
        { detail: 'Playlist name is required.' },
        { status: 400 }
      );
    }

    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '') + `-${Date.now().toString().slice(-4)}`;

    const newPlaylist = {
      id: `play_${Date.now()}`,
      slug: slug,
      name: name,
      description: description || '',
      thumbnail: thumbnail || null,
      is_public: is_public !== undefined ? is_public : true,
      owner_id: user.id,
      blog_count: 0,
      total_views: 0,
      total_likes: 0,
      blogs: []
    };

    db.playlists.push(newPlaylist);
    writeDB(db);

    return NextResponse.json(newPlaylist, { status: 201 });
  } catch (error) {
    console.error('Create playlist API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
