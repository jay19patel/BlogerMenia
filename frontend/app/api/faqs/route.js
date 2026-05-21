import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';

export async function GET(request) {
  try {
    const db = readDB();
    return NextResponse.json(db.faqs || []);
  } catch (error) {
    console.error('Fetch FAQs API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
