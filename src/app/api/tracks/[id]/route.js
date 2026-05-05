import { NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';

export async function DELETE(request, { params }) {
  const id = params.id;
  try {
    if (!db || !storage) return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
    
    const docRef = db.collection('tracks').doc(id);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      const file = storage.file(data.filename);
      await file.delete().catch(() => console.error("File not found in bucket"));
      await docRef.delete();
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const id = params.id;
  try {
    if (!db) return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
    const body = await request.json();
    await db.collection('tracks').doc(id).update(body);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
