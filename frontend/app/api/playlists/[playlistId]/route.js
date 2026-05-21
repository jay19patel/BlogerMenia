import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { playlistId } = await params;

    const db = readDB();
    const pl = db.playlists.find(p => p.id === playlistId || p.slug === playlistId);

    if (!pl) {
      return NextResponse.json(
        { detail: 'Playlist not found.' },
        { status: 404 }
      );
    }

    const owner = db.users.find(u => u.id === pl.owner_id);
    const resolvedPlaylist = {
      ...pl,
      owner: owner ? {
        id: owner.id,
        email: owner.email,
        full_name: owner.full_name,
        username: owner.email.split('@')[0]
      } : null
    };

    return NextResponse.json(resolvedPlaylist);
  } catch (error) {
    console.error('Fetch single playlist API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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

    const updateData = await request.json();

    if (updateData.name !== undefined) pl.name = updateData.name;
    if (updateData.description !== undefined) pl.description = updateData.description;
    if (updateData.is_public !== undefined) pl.is_public = updateData.is_public;
    if (updateData.thumbnail !== undefined) pl.thumbnail = updateData.thumbnail;

    db.playlists[plIndex] = pl;
    writeDB(db);

    return NextResponse.json(pl);
  } catch (error) {
    console.error('Update playlist API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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

    if (pl.owner_id !== decoded.id && decoded.id !== 'usr_admin') {
      return NextResponse.json(
        { detail: 'You are not authorized to delete this playlist.' },
        { status: 403 }
      );
    }

    db.playlists.splice(plIndex, 1);
    writeDB(db);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete playlist API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
