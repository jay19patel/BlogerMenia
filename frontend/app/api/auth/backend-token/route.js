// Next.js API route: POST /api/auth/backend-token
// Returns a short-lived HS256 JWT that FastAPI verifies with python-jose.
// Payload: { sub: userId, email, role }
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SignJWT } from 'jose';

const ALGORITHM = 'HS256';
const TTL_SECONDS = 60 * 60; // 1 hour

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }

    const { id, email, role } = session.user;

    const token = await new SignJWT({ sub: id, email, role })
      .setProtectedHeader({ alg: ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(`${TTL_SECONDS}s`)
      .sign(getSecret());

    return NextResponse.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: TTL_SECONDS,
    });
  } catch (error) {
    console.error('backend-token error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
