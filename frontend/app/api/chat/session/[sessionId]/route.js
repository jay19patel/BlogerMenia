import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization');
    const decoded = verifyToken(authHeader);

    if (!decoded) {
      return NextResponse.json(
        { detail: 'Given token not valid or expired.' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;
    const db = readDB();

    if (!db.chatSessions) {
      return NextResponse.json({ detail: 'Session not found.' }, { status: 404 });
    }

    const session = db.chatSessions.find(s => s.id === sessionId && s.user_id === decoded.id);

    if (!session) {
      return NextResponse.json({ detail: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Fetch session API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization');
    const decoded = verifyToken(authHeader);

    if (!decoded) {
      return NextResponse.json(
        { detail: 'Given token not valid or expired.' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;
    const db = readDB();

    if (!db.chatSessions) return NextResponse.json({ detail: 'Deleted' }, { status: 200 });

    const initialLength = db.chatSessions.length;
    db.chatSessions = db.chatSessions.filter(s => !(s.id === sessionId && s.user_id === decoded.id));

    if (db.chatSessions.length < initialLength) {
      writeDB(db);
    }

    return NextResponse.json({ detail: 'Session deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Delete session API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
