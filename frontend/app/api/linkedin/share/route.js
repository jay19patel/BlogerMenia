import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { blogSlug, blogTitle, blogExcerpt, blogUrl } = await req.json();

  if (!blogSlug || !blogTitle || !blogUrl) {
    return NextResponse.json({ detail: 'Missing required fields' }, { status: 400 });
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).select('+linkedin_access_token');

  if (!user?.linkedinId || !user?.linkedin_access_token) {
    return NextResponse.json({ detail: 'LinkedIn not connected' }, { status: 400 });
  }

  const shareText = blogExcerpt
    ? `${blogTitle}\n\n${blogExcerpt}\n\nRead more: ${blogUrl}`
    : `${blogTitle}\n\nRead more: ${blogUrl}`;

  // Post to LinkedIn using UGC Posts API
  const postBody = {
    author: `urn:li:person:${user.linkedinId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: shareText },
        shareMediaCategory: 'ARTICLE',
        media: [
          {
            status: 'READY',
            description: { text: blogExcerpt || blogTitle },
            originalUrl: blogUrl,
            title: { text: blogTitle },
          },
        ],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const linkedinRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.linkedin_access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });

  if (!linkedinRes.ok) {
    const err = await linkedinRes.json().catch(() => ({}));
    console.error('LinkedIn UGC Post error:', err);
    // Token may have expired — clear it so user is prompted to reconnect
    if (linkedinRes.status === 401) {
      await User.findByIdAndUpdate(session.user.id, {
        $unset: { linkedin_access_token: '' },
      });
      return NextResponse.json(
        { detail: 'LinkedIn session expired. Please reconnect LinkedIn.' },
        { status: 401 }
      );
    }
    return NextResponse.json({ detail: 'Failed to post on LinkedIn' }, { status: 500 });
  }

  // Track that this blog has been shared to LinkedIn by this user
  await User.findByIdAndUpdate(session.user.id, {
    $addToSet: { linkedin_shared_posts: blogSlug },
  });

  return NextResponse.json({ message: 'Posted to LinkedIn successfully' });
}
