const admin = require('firebase-admin');
let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
} else {
  credential = admin.credential.applicationDefault();
}

admin.initializeApp({
  credential: credential
});

const db = admin.firestore();

async function checkComics() {
  const snapshot = await db.collection('comics').get();
  console.log('Total comics:', snapshot.size);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('ID:', doc.id, '| Title:', data.title, '| Author:', data.author, '| Published:', data.isPublished);
  });
  process.exit();
}

checkComics();
