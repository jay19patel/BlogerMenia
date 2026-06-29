import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

// Handles LinkedIn OAuth callback for account linking
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const base = process.env.NEXTAUTH_URL;

  if (error) {
    return NextResponse.redirect(`${base}/profile?linkedin=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${base}/profile?linkedin=error`);
  }

  // Verify CSRF state against cookie
  const cookieStore = await cookies();
  const storedState = cookieStore.get('li_oauth_state')?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${base}/profile?linkedin=invalid_state`);
  }

  let userId;
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    userId = stateData.userId;
    if (!userId) throw new Error('missing userId');
  } catch {
    return NextResponse.redirect(`${base}/profile?linkedin=error`);
  }

  // Exchange authorization code for access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${base}/api/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error('LinkedIn token exchange failed:', tokenData);
    return NextResponse.redirect(`${base}/profile?linkedin=token_failed`);
  }

  // Fetch LinkedIn profile using OpenID Connect userinfo endpoint
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profileData = await profileRes.json();

  if (!profileData.sub) {
    return NextResponse.redirect(`${base}/profile?linkedin=profile_failed`);
  }

  await connectToDatabase();

  // Prevent linking if this LinkedIn account is already used by another user
  const alreadyLinked = await User.findOne({ linkedinId: profileData.sub });
  if (alreadyLinked && alreadyLinked._id.toString() !== userId) {
    return NextResponse.redirect(`${base}/profile?linkedin=already_linked`);
  }

  await User.findByIdAndUpdate(userId, {
    linkedinId: profileData.sub,
    linkedin_access_token: tokenData.access_token,
  });

  const response = NextResponse.redirect(`${base}/profile?linkedin=connected`);
  response.cookies.delete('li_oauth_state');
  return response;
}
