const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Target the backend env or root
dotenv.config();

if (!admin.apps.length) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
    } else {
        credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || 'comicbooksgeo'
    });
}

const email = process.argv[2];

if (!email || !email.includes('@')) {
    console.log('--------------------------------------------------');
    console.error('ERROR: Please provide a valid email address!');
    console.log('Usage: node set-admin.js user@example.com');
    console.log('--------------------------------------------------');
    process.exit(1);
}

async function setAdminClaim() {
    try {
        console.log(`Setting admin claim for: ${email}...`);
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        console.log('--------------------------------------------------');
        console.log(`✅ Success! Admin claim [admin: true] set for UID: ${user.uid}`);
        console.log('--------------------------------------------------');
        console.log('Note: You MUST sign out and sign back in to the app for the new claim to take effect.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ User with email ${email} not found.`);
        } else {
            console.error('❌ Error setting admin claim:', error.message);
        }
        process.exit(1);
    }
}

setAdminClaim();
