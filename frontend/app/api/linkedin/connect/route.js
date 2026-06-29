import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Initiates LinkedIn OAuth flow for account linking (user already logged in)
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);
  }

  // Encode user ID + timestamp as state to prevent CSRF
  const state = Buffer.from(JSON.stringify({
    userId: session.user.id,
    ts: Date.now(),
  })).toString('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/linkedin/callback`,
    state,
    scope: 'openid profile email w_member_social',
  });

  const response = NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params}`
  );

  // Store state in cookie for verification in the callback
  response.cookies.set('li_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
