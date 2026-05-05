import admin from 'firebase-admin';

const rawStr = process.env.FIREBASE_SERVICE_ACCOUNT;
let parsed = rawStr;
if (typeof rawStr === 'string' && rawStr.startsWith("'") && rawStr.endsWith("'")) {
  parsed = rawStr.slice(1, -1);
}
const serviceAccount = JSON.parse(parsed);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function setCors() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  console.log(`Setting CORS for bucket: ${bucketName}`);
  
  const bucket = admin.storage().app.storage().bucket(bucketName);
  
  try {
    await bucket.setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD'],
        origin: ['*'],
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
      },
    ]);
    console.log("CORS Configuration successfully set!");
  } catch(e) {
    console.error("Error setting CORS:", e.message);
  }
}

setCors();
