import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';

export async function GET(request) {
  try {
    const db = readDB();

    const activeUsers = db.users.filter(u => u.is_active).map(u => {
      const { password_hash, ...publicUser } = u;
      return publicUser;
    });

    return NextResponse.json(activeUsers);
  } catch (error) {
    console.error('Fetch all users API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
