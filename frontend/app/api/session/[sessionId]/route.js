import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ChatSession from '@/models/ChatSession';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { sessionId } = await params;

    const doc = await ChatSession.findOne({ session_id: sessionId }).lean();
    if (!doc) {
      return NextResponse.json({ detail: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      session_id: sessionId,
      mode: 'retrieve',
      conversation: doc.conversation || [],
      message: 'Session retrieved.',
      blog_state: doc.blog_state || null,
      change_summary: null,
    });
  } catch (err) {
    console.error('GET session error:', err);
    return NextResponse.json({ detail: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { sessionId } = await params;

    await ChatSession.deleteOne({ session_id: sessionId });
    return NextResponse.json({ status: 'deleted', session_id: sessionId });
  } catch (err) {
    console.error('DELETE session error:', err);
    return NextResponse.json({ detail: 'Failed to delete session' }, { status: 500 });
  }
}
