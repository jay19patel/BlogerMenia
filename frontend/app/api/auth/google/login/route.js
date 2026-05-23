import { NextResponse } from 'next/server';
import { readDB, writeDB, generateToken } from '@/lib/db';

export async function POST(request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { detail: 'OAuth authorization code is required.' },
        { status: 400 }
      );
    }

    const db = readDB();
    
    // Find or create a mock Google user
    let user = db.users.find(u => u.email === 'googleuser@example.com');
    if (!user) {
      user = {
        id: 'usr_google',
        email: 'googleuser@example.com',
        password_hash: '', // No password for OAuth users
        full_name: 'Google User',
        profile_image: 'https://ui-avatars.com/api/?name=Google+User&background=33a852&color=fff',
        headline: 'Google Authenticated Creator',
        blog_count: 0,
        total_views: 0,
        total_likes: 0,
        is_active: true
      };
      db.users.push(user);
      writeDB(db);
    }

    const accessToken = generateToken({ id: user.id, email: user.email });

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        profile_image: user.profile_image,
        headline: user.headline
      }
    });
  } catch (error) {
    console.error('Google login API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
