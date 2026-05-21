import { NextResponse } from 'next/server';
import { readDB, writeDB, hashPassword } from '@/lib/db';

export async function POST(request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { detail: 'Email, password, and full name are required.' },
        { status: 400 }
      );
    }

    const db = readDB();
    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      return NextResponse.json(
        { detail: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      password_hash: hashPassword(password),
      full_name: full_name,
      profile_image: null,
      headline: '',
      blog_count: 0,
      total_views: 0,
      total_likes: 0,
      is_active: true
    };

    db.users.push(newUser);
    writeDB(db);

    const { password_hash, ...userProfile } = newUser;
    return NextResponse.json(userProfile, { status: 201 });
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
