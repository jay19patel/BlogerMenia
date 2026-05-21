import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

export async function POST(request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { detail: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const db = readDB();
    const newContact = {
      id: `contact_${Date.now()}`,
      name,
      email,
      subject: subject || 'No Subject',
      message,
      created_at: new Date().toISOString()
    };

    if (!db.contacts) {
      db.contacts = [];
    }

    db.contacts.push(newContact);
    writeDB(db);

    return NextResponse.json({ success: true, message: 'Your message has been sent successfully.' }, { status: 201 });
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
