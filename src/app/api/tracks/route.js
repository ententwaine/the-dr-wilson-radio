export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    if (!db) return NextResponse.json([]);
    const snapshot = await db.collection('tracks').orderBy('uploadedAt', 'desc').get();
    const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(tracks);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!db) return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });

    const body = await request.json();
    const { title, filename, url, type, importance, duration } = body;

    const trackData = {
      title,
      filename,
      url,
      type: type || 'SONG',
      status: 'PENDING',
      importance: importance ? parseInt(importance) : null,
      duration: duration || 0,
      uploadedAt: new Date().toISOString()
    };

    const docRef = await db.collection('tracks').add(trackData);

    return NextResponse.json({ success: true, track: { id: docRef.id, ...trackData } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save track" }, { status: 500 });
  }
}
