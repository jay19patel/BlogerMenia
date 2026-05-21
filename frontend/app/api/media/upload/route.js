import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/db';

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

    // Since this is a fake DB backend for Next.js, we won't actually process multipart form data 
    // and save local files (unless specifically required). We'll mock a successful upload 
    // and return a premium placeholder image or base64 placeholder.
    
    // In a real app we'd use formidable/multer or cloud storage like S3.
    // Here we'll just return a nice tech unsplash image to keep the flow working.

    const premiumPlaceholders = [
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800'
    ];

    const randomPlaceholder = premiumPlaceholders[Math.floor(Math.random() * premiumPlaceholders.length)];

    return NextResponse.json({
      url: randomPlaceholder,
      detail: 'Mock file uploaded successfully.'
    }, { status: 201 });
  } catch (error) {
    console.error('Media upload API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
