import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { auto_post } = await req.json();

  await connectToDatabase();

  const user = await User.findById(session.user.id);

  if (!user?.linkedinId) {
    return NextResponse.json({ detail: 'LinkedIn not connected' }, { status: 400 });
  }

  await User.findByIdAndUpdate(session.user.id, { linkedin_auto_post: !!auto_post });

  return NextResponse.json({ linkedin_auto_post: !!auto_post });
}
