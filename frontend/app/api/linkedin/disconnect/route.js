import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  await User.findByIdAndUpdate(session.user.id, {
    $unset: { linkedinId: '', linkedin_access_token: '' },
    $set: { linkedin_auto_post: false },
  });

  return NextResponse.json({ message: 'LinkedIn disconnected' });
}
