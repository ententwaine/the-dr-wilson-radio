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
