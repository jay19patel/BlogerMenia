import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const ALGORITHM = 'HS256';

/**
 * Verify the HS256 Bearer token signed by Next.js /api/auth/backend-token.
 * Returns { id, email, role } on success.
 * Returns a NextResponse(401) on failure — caller should return it immediately.
 */
export async function verifyBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return { error: NextResponse.json({ detail: 'Authentication required.' }, { status: 401 }) };
  }

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALGORITHM] });

    if (!payload.sub || !payload.email) {
      return { error: NextResponse.json({ detail: 'Invalid token payload.' }, { status: 401 }) };
    }

    return { user: { id: payload.sub, email: payload.email, role: payload.role || 'User' } };
  } catch {
    return { error: NextResponse.json({ detail: 'Token is invalid or expired.' }, { status: 401 }) };
  }
}

/** Helper: isAdmin check */
export function isAdmin(user) {
  return user?.role === 'Admin';
}
