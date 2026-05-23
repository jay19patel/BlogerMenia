import { NextResponse } from 'next/server';
import { bucket, bucketName } from '@/lib/gcs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isDevelopment && !bucket) {
      return NextResponse.json({ detail: "Google Cloud Storage is not configured properly." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'general';

    if (!file) {
      const url = formData.get('url');
      if (url) {
         return NextResponse.json({ detail: "URL upload is not supported directly. Please upload a file." }, { status: 400 });
      }
      return NextResponse.json({ detail: "File is required" }, { status: 400 });
    }

    // Prepare file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create unique filename
    const originalName = file.name || 'upload';
    const extension = path.extname(originalName) || '.png'; // Fallback to png
    const uniqueFilename = `${folder}/${randomUUID()}${extension}`;
    const gcsPath = `blogermenia/${uniqueFilename}`;

    let publicUrl = '';

    if (isDevelopment) {
      // Local Upload
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'blogermenia', folder);
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, `${path.basename(uniqueFilename)}`);
      await fs.promises.writeFile(filePath, buffer);
      
      publicUrl = `/uploads/${gcsPath}`;
    } else {
      // GCP Upload
      const blob = bucket.file(gcsPath);
      
      // Create write stream
      await new Promise((resolve, reject) => {
        const blobStream = blob.createWriteStream({
          resumable: false,
          contentType: file.type,
        });

        blobStream.on('error', (err) => reject(err));
        blobStream.on('finish', () => resolve());
        blobStream.end(buffer);
      });

      try {
        await blob.makePublic();
      } catch (e) {
        console.log("Could not make public explicitly, checking if bucket is already public...", e.message);
      }

      publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsPath}`;
    }

    return NextResponse.json({
      url: publicUrl,
      public_id: gcsPath,
      file_path: publicUrl, // UI expects this to save the path
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ detail: "Failed to upload file. " + error.message }, { status: 500 });
  }
}
