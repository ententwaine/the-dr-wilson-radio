
import admin from 'firebase-admin';

console.log("Checking Firebase Credentials...");
const rawStr = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log("Service Account Length:", rawStr ? rawStr.length : 'MISSING');

try {
  let parsed = rawStr;
  if (typeof rawStr === 'string' && rawStr.startsWith("'") && rawStr.endsWith("'")) {
    parsed = rawStr.slice(1, -1);
  }
  const serviceAccount = JSON.parse(parsed);
  console.log("JSON Parse: SUCCESS");
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log("Firebase Admin Initialize: SUCCESS");
  }

  const db = admin.firestore();
  console.log("Firestore Access: SUCCESS");

  const storage = admin.storage().bucket();
  console.log("Storage Bucket Access: SUCCESS. Bucket Name:", storage.name);

  // Test storage
  async function test() {
    try {
      const file = storage.file('test.txt');
      await file.save('hello', { contentType: 'text/plain' });
      console.log("Storage Write: SUCCESS");
      
      // Test public
      await file.makePublic();
      console.log("Storage Make Public: SUCCESS");
    } catch(e) {
      console.log("Storage Error:", e.message);
    }
  }
  test();
} catch(e) {
  console.error("Error:", e.message);
}
