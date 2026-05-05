export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    if (!db) return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });

    const broadcastRef = db.collection('broadcast').doc('state');
    let broadcastDoc = await broadcastRef.get();
    
    let broadcastData = broadcastDoc.data();
    if (!broadcastDoc.exists || !broadcastData) {
      broadcastData = { currentTrackId: null, startedAt: new Date().toISOString(), songsSinceAd: 0 };
      await broadcastRef.set(broadcastData);
    }

    let currentTrack = null;
    let elapsed = 0;

    if (broadcastData.currentTrackId) {
      const trackDoc = await db.collection('tracks').doc(broadcastData.currentTrackId).get();
      if (trackDoc.exists) {
        currentTrack = { id: trackDoc.id, ...trackDoc.data() };
        elapsed = (Date.now() - new Date(broadcastData.startedAt).getTime()) / 1000;
      }
    }

    if (currentTrack && elapsed < currentTrack.duration + 1) {
      return NextResponse.json({ 
        track: currentTrack, 
        seekOffset: Math.max(0, elapsed),
        isAd: currentTrack.type === 'ADVERTISEMENT'
      });
    }

    let nextTrack = null;
    let newSongsSinceAd = broadcastData.songsSinceAd || 0;

    const playOnceSnapshot = await db.collection('tracks')
      .where('type', '==', 'PLAY_ONCE')
      .where('status', '==', 'PENDING')
      .orderBy('uploadedAt', 'asc')
      .limit(1)
      .get();

    if (!playOnceSnapshot.empty) {
      const doc = playOnceSnapshot.docs[0];
      nextTrack = { id: doc.id, ...doc.data() };
      await db.collection('tracks').doc(doc.id).update({ status: 'PLAYED' });
    } else {
      let settingsData = { adFrequency: 3 };
      const settingsDoc = await db.collection('settings').doc('global').get();
      if (settingsDoc.exists) {
        settingsData = settingsDoc.data();
      }

      if (broadcastData.songsSinceAd >= settingsData.adFrequency) {
        const adsSnapshot = await db.collection('tracks').where('type', '==', 'ADVERTISEMENT').get();
        if (!adsSnapshot.empty) {
          const ads = adsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const weightedAds = [];
          ads.forEach(ad => {
            const weight = ad.importance || 1;
            for (let i = 0; i < weight; i++) weightedAds.push(ad);
          });
          nextTrack = weightedAds[Math.floor(Math.random() * weightedAds.length)];
          newSongsSinceAd = 0;
        }
      }

      if (!nextTrack) {
        const songsSnapshot = await db.collection('tracks').where('type', '==', 'SONG').get();
        if (!songsSnapshot.empty) {
          const songs = songsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          nextTrack = songs[Math.floor(Math.random() * songs.length)];
          newSongsSinceAd += 1;
        }
      }
    }

    if (!nextTrack) {
      return NextResponse.json({ track: null, error: "No tracks available" });
    }

    await broadcastRef.update({
      currentTrackId: nextTrack.id,
      startedAt: new Date().toISOString(),
      songsSinceAd: newSongsSinceAd
    });

    return NextResponse.json({ 
      track: nextTrack, 
      seekOffset: 0,
      isAd: nextTrack.type === 'ADVERTISEMENT'
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to get broadcast state" }, { status: 500 });
  }
}
