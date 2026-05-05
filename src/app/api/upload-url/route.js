import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase';

export async function POST(request) {
  try {
    if (!storage) return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });

    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename) return NextResponse.json({ error: "Filename is required" }, { status: 400 });

    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const file = storage.file(safeFilename);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType || 'audio/mpeg',
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storage.name}/o/${encodeURIComponent(safeFilename)}?alt=media`;

    return NextResponse.json({ signedUrl: url, publicUrl, safeFilename });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
