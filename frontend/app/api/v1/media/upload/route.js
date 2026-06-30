import { NextResponse } from 'next/server';
import { verifyBearerToken } from '@/lib/apiAuth';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// ─── GCS Upload Helper ───────────────────────────────────────────────────────

let _gcsClient = null;

async function getGcsClient() {
  if (_gcsClient) return _gcsClient;
  const { Storage } = await import('@google-cloud/storage');

  const credJson = process.env.GCS_CREDENTIALS_JSON;
  if (credJson) {
    const creds = JSON.parse(credJson);
    _gcsClient = new Storage({ credentials: creds, projectId: creds.project_id });
  } else {
    _gcsClient = new Storage();
  }
  return _gcsClient;
}

async function uploadToGcs(buffer, gcsPath, contentType) {
  const client = await getGcsClient();
  const bucket = client.bucket(process.env.GCS_BUCKET_NAME);
  const blob = bucket.file(gcsPath);
  await blob.save(buffer, { contentType, resumable: false });
  try { await blob.makePublic(); } catch { /* may already be public */ }
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsPath}`;
}

// ─── Image Compression with sharp ───────────────────────────────────────────

async function compressImage(buffer) {
  const sharp = (await import('sharp')).default;
  return sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

// ─── POST /api/v1/media/upload ───────────────────────────────────────────────

export async function POST(request) {
  try {
    const { user, error } = await verifyBearerToken(request);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'uploads';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ detail: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // Determine file type and whether to compress
    const originalName = file.name || 'upload.jpg';
    const ext = path.extname(originalName).toLowerCase();
    const isImage = /^image\//.test(file.type || '') || ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    const isGif = file.type === 'image/gif' || ext === '.gif';

    let contentType = 'image/jpeg';
    let outputExt = '.jpg';

    if (isImage && !isGif) {
      buffer = await compressImage(buffer);
    } else {
      contentType = file.type || 'application/octet-stream';
      outputExt = ext || '.bin';
    }

    const fileName = `${uuidv4()}${outputExt}`;
    const gcsPath = `${folder}/${fileName}`;

    let publicUrl;
    if (process.env.GCS_BUCKET_NAME) {
      publicUrl = await uploadToGcs(buffer, gcsPath, contentType);
    } else {
      // Local fallback: write to /public/uploads
      const fs = await import('fs');
      const os = await import('os');
      const localDir = path.join(process.cwd(), 'public', 'uploads', folder);
      fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(path.join(localDir, fileName), buffer);
      publicUrl = `/uploads/${folder}/${fileName}`;
    }

    return NextResponse.json({ url: publicUrl, file_path: publicUrl, public_id: gcsPath });
  } catch (err) {
    console.error('Media upload error:', err);
    return NextResponse.json({ detail: `Upload failed: ${err.message}` }, { status: 500 });
  }
}
