import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function GET() {
  try {
    const db = readDB();
    const categories = db.categories || [];
    
    return NextResponse.json({
      count: categories.length,
      results: categories
    });
  } catch (error) {
    console.error('Fetch categories API error:', error);
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

    const { name, slug } = await request.json();

    if (!name) {
      return NextResponse.json(
        { detail: 'Category name is required.' },
        { status: 400 }
      );
    }

    const db = readDB();
    
    // Check if category already exists (case-insensitive)
    const existing = db.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      return NextResponse.json(existing);
    }

    const newSlug = slug || name.trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newCategory = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      slug: newSlug
    };

    db.categories.push(newCategory);
    writeDB(db);

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Create category API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
