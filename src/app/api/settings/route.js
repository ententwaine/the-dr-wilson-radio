export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    if (!db) return NextResponse.json({ adFrequency: 3 });
    const docRef = db.collection('settings').doc('global');
    const doc = await docRef.get();
    if (!doc.exists) {
      await docRef.set({ adFrequency: 3 });
      return NextResponse.json({ adFrequency: 3 });
    }
    return NextResponse.json(doc.data());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    if (!db) return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
    const body = await request.json();
    await db.collection('settings').doc('global').set({ adFrequency: body.adFrequency }, { merge: true });
    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
