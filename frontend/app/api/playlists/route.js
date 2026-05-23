import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function normalisePlaylist(playlist) {
  if (!playlist) return playlist;
  return {
    ...playlist,
    id: playlist._id?.toString(),
    blogs: (playlist.blogs || []).map(blog =>
      typeof blog === 'object' && blog !== null
        ? { ...blog, id: blog._id?.toString() }
        : blog
    ),
  };
}

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get('skip')) || 0;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const ownerId = searchParams.get('ownerId') || '';
    const isPublic = searchParams.get('is_public');
    const sort = searchParams.get('sort') || '-createdAt';
    const blogId = searchParams.get('blogId');

    let query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (ownerId) {
      query.owner = ownerId;
    }

    if (isPublic === 'true') {
      query.is_public = true;
    }

    if (blogId) {
      query.blogs = blogId;
    }

    let sortOptions = {};
    if (sort === '-views' || sort === '-total_views') {
      sortOptions.total_views = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const total = await Playlist.countDocuments(query);
    const playlists = await Playlist.find(query)
      .populate('owner', 'full_name username profile_image')
      .populate('blogs', 'title slug thumbnail views')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      total,
      playlists: playlists.map(normalisePlaylist),
      next: skip + limit < total
        ? `${req.nextUrl.pathname}?skip=${skip + limit}&limit=${limit}`
        : null,
      previous: skip > 0
        ? `${req.nextUrl.pathname}?skip=${Math.max(0, skip - limit)}&limit=${limit}`
        : null,
    });
  } catch (error) {
    console.error('GET Playlists error:', error);
    return NextResponse.json({ detail: 'Failed to fetch playlists' }, { status: 500 });
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

    // Accept either 'name' (model field) or 'title' for backwards compat
    const playlistName = (data.name || data.title || '').trim();
    if (!playlistName) {
      return NextResponse.json({ detail: 'Playlist name is required' }, { status: 400 });
    }

    // Generate unique slug
    let baseSlug = playlistName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = data.slug?.trim() || baseSlug;
    let counter = 1;
    while (await Playlist.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Normalise cover_image — accept both 'cover_image' and 'thumbnail' from client
    const coverImage = data.cover_image || data.thumbnail || '';

    // Filter valid blog ObjectIds
    const blogs = Array.isArray(data.blogs)
      ? data.blogs.filter(id => id && String(id).match(/^[0-9a-fA-F]{24}$/))
      : [];

    const newPlaylist = await Playlist.create({
      name: playlistName,
      slug,
      description: data.description || '',
      cover_image: coverImage,
      is_public: data.is_public !== false,
      blogs,
      owner: session.user.id,
    });

    const populated = await Playlist.findById(newPlaylist._id)
      .populate('owner', 'full_name username profile_image')
      .populate('blogs', 'title slug thumbnail views')
      .lean();

    return NextResponse.json(normalisePlaylist(populated), { status: 201 });
  } catch (error) {
    console.error('POST Playlist error:', error);
    return NextResponse.json(
      { detail: 'Failed to create playlist. ' + error.message },
      { status: 500 }
    );
  }
}
