import * as admin from 'firebase-admin';
// Use require to load the service account JSON as a plain object
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function setupAdmin() {
    try {
        // Replace with the UID of the user you want to make admin
        const targetUid = '2E759WjvxbN540bKwlzxseDLp5E2';

        // Set admin custom claim
        await admin.auth().setCustomUserClaims(targetUid, { admin: true });

        console.log('Admin role set successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error setting admin role:', error);
        process.exit(1);
    }
}

setupAdmin();