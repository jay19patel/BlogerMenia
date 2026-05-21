import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function GET(request) {
  try {
    const db = readDB();
    // Return all testimonials
    return NextResponse.json(db.testimonials || []);
  } catch (error) {
    console.error('Fetch testimonials API error:', error);
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

    const { content, rating } = await request.json();

    if (!content) {
      return NextResponse.json(
        { detail: 'Content is required.' },
        { status: 400 }
      );
    }

    const newTestimonial = {
      id: `test_${Date.now()}`,
      name: user.full_name,
      role: user.headline || 'User',
      avatar: user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`,
      content: content,
      rating: rating || 5
    };

    if (!db.testimonials) {
      db.testimonials = [];
    }
    
    db.testimonials.push(newTestimonial);
    writeDB(db);

    return NextResponse.json(newTestimonial, { status: 201 });
  } catch (error) {
    console.error('Create testimonial API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
