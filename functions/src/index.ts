import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const setAdminRole = functions.https.onCall(async (data, context) => {
    // Check if the request is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    // Check if the user is already an admin
    const callerUid = context.auth.uid;
    const callerUser = await admin.auth().getUser(callerUid);
    const isAdmin = callerUser.customClaims?.admin === true;

    if (!isAdmin) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can set admin roles.'
        );
    }

    // Get the target user's UID
    const { targetUid } = data;
    if (!targetUid) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with a target user UID.'
        );
    }

    try {
        // Set the admin custom claim
        await admin.auth().setCustomUserClaims(targetUid, { admin: true });
        return { message: 'Admin role set successfully' };
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'Error setting admin role');
    }
}); 