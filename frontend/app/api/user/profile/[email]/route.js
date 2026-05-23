import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req, { params }) {
  try {
    const { email } = await params;
    await connectToDatabase();
    
    // Find user by email or username (the param name is email but it can be username based on UI)
    const user = await User.findOne({
      $or: [
        { email: decodeURIComponent(email) },
        { username: decodeURIComponent(email) }
      ]
    }).select('-password').lean();

    if (!user) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET User Profile error:", error);
    return NextResponse.json({ detail: "Failed to fetch user profile" }, { status: 500 });
  }
}
