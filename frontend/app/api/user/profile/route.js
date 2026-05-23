import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    // Prevent user from changing their own role or ID
    delete data.role;
    delete data._id;

    const updatedUser = await User.findByIdAndUpdate(session.user.id, { $set: data }, { returnDocument: 'after' })
      .select('-password');

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("PATCH Profile error:", error);
    return NextResponse.json({ detail: "Failed to update profile. " + error.message }, { status: 500 });
  }
}
