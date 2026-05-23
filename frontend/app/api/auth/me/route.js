import { NextResponse } from 'next/server';
import { readDB, writeDB, verifyToken } from '@/lib/db';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const decoded = verifyToken(authHeader);

    if (!decoded) {
      return NextResponse.json(
        { detail: 'Given token not valid or expired.' },
        { status: 401 }
      );
    }

    const db = readDB();
    const user = db.users.find(u => u.id === decoded.id);

    if (!user) {
      return NextResponse.json(
        { detail: 'User session not found.' },
        { status: 401 }
      );
    }

    const { password_hash, ...userProfile } = user;
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Fetch me API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const decoded = verifyToken(authHeader);

    if (!decoded) {
      return NextResponse.json(
        { detail: 'Given token not valid or expired.' },
        { status: 401 }
      );
    }

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === decoded.id);

    if (userIndex === -1) {
      return NextResponse.json(
        { detail: 'User profile not found.' },
        { status: 401 }
      );
    }

    // Support both JSON payloads and Multi-part Form Data
    let updateData = {};
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      updateData = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        updateData[key] = value;
      });
    }

    const user = db.users[userIndex];

    // Merge first_name and last_name into full_name
    if (updateData.first_name !== undefined || updateData.last_name !== undefined) {
      const first = updateData.first_name !== undefined ? updateData.first_name : (user.full_name?.split(' ')[0] || '');
      const last = updateData.last_name !== undefined ? updateData.last_name : (user.full_name?.split(' ').slice(1).join(' ') || '');
      user.full_name = `${first} ${last}`.trim();
    }

    if (updateData.full_name !== undefined) {
      user.full_name = updateData.full_name;
    }

    if (updateData.headline !== undefined) {
      user.headline = updateData.headline;
    }

    if (updateData.profile_image !== undefined) {
      user.profile_image = updateData.profile_image;
    }

    db.users[userIndex] = user;
    writeDB(db);

    const { password_hash, ...userProfile } = user;
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Update me API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
