import { NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { parseBuffer } from 'music-metadata';

export async function POST(request) {
  try {
    if (!db || !storage) {
      return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');
    const importance = formData.get('importance');

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let duration = 0;
    try {
      const metadata = await parseBuffer(buffer, file.type || 'audio/mpeg');
      duration = metadata.format.duration || 0;
    } catch (err) {
      console.warn("Could not parse duration:", err);
    }

    const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Upload to Firebase Storage
    const storageFile = storage.file(safeFilename);
    await storageFile.save(buffer, {
      contentType: file.type || 'audio/mpeg',
      resumable: false // Prevent 404 errors on new Firebase buckets
    });
    
    // Make public to get the public URL (Requires Storage Bucket to allow public reads)
    try {
      await storageFile.makePublic();
    } catch(e) {
      console.log("Could not make public automatically. Ensure your bucket has public read permissions.", e.message);
    }

    const publicUrl = `https://storage.googleapis.com/${storage.name}/${safeFilename}`;

    // Save to Firestore
    const trackData = {
      title: file.name,
      filename: safeFilename,
      url: publicUrl,
      type: type || 'SONG',
      status: 'PENDING',
      importance: importance ? parseInt(importance) : null,
      duration: duration,
      uploadedAt: new Date().toISOString()
    };

    const docRef = await db.collection('tracks').add(trackData);

    return NextResponse.json({ success: true, track: { id: docRef.id, ...trackData } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
