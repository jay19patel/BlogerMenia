import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    
    const db = readDB();

    const topAuthors = db.users
      .filter(u => u.is_active)
      .sort((a, b) => b.total_views - a.total_views)
      .slice(0, limit)
      .map(u => {
        const { password_hash, ...publicUser } = u;
        return publicUser;
      });

    return NextResponse.json(topAuthors);
  } catch (error) {
    console.error('Fetch top authors API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
