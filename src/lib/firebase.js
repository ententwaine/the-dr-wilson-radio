import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    let rawStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
    if (typeof rawStr === 'string' && rawStr.startsWith("'") && rawStr.endsWith("'")) {
      rawStr = rawStr.slice(1, -1);
    }
    const serviceAccount = JSON.parse(rawStr);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export const db = admin.apps.length ? admin.firestore() : null;
export const storage = admin.apps.length ? admin.storage().bucket() : null;
