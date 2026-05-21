import { NextResponse } from 'next/server';
import { readDB, hashPassword, generateToken } from '@/lib/db';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { detail: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const db = readDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password_hash !== hashPassword(password)) {
      return NextResponse.json(
        { detail: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { detail: 'Your account has been deactivated.' },
        { status: 403 }
      );
    }

    // Generate JWT Access Token
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
    console.error('Login API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
