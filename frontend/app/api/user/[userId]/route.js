import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    const db = readDB();

    const user = db.users.find(u => u.id === userId);

    if (!user) {
      return NextResponse.json(
        { detail: 'User not found.' },
        { status: 404 }
      );
    }

    // Strip sensitive fields
    const { password_hash, ...publicUser } = user;

    return NextResponse.json(publicUser);
  } catch (error) {
    console.error('Fetch user by ID API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
