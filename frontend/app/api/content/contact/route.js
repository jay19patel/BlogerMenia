import { NextResponse } from 'next/server';
// You might want to create a Contact model, or just send an email.
// For now, let's just log it and return success, or if there's a Contact model, save it.
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

// Simple Contact Schema
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

export async function POST(req) {
  try {
    await connectToDatabase();
    const data = await req.json();

    if (!data.name || !data.email || !data.message) {
      return NextResponse.json({ detail: "Name, email, and message are required" }, { status: 400 });
    }

    await Contact.create(data);

    return NextResponse.json({ success: true, message: "Your message has been sent." }, { status: 201 });
  } catch (error) {
    console.error("POST Contact error:", error);
    return NextResponse.json({ detail: "Failed to send message" }, { status: 500 });
  }
}
