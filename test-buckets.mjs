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

async function testBucket(bucketName) {
  console.log(`Testing bucket: ${bucketName}`);
  try {
    const storage = admin.storage().app.storage().bucket(bucketName);
    const file = storage.file('test2.txt');
    await file.save('hello', { contentType: 'text/plain' });
    console.log(`  - Write: SUCCESS`);
    await file.makePublic();
    console.log(`  - Make Public: SUCCESS`);
  } catch(e) {
    console.log(`  - Error:`, e.message);
  }
}

async function run() {
  await testBucket('the-dr-wilson-radio.appspot.com');
  await testBucket('the-dr-wilson-radio.firebasestorage.app');
}
run();
