import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin Initialized Successfully");
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is missing. Push notifications will fail.");
    }
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

export const adminDb = getApps().length ? getFirestore(getApp()) : null;
export const adminMessaging = getApps().length ? getMessaging(getApp()) : null;
export const adminAuth = getApps().length ? getAuth(getApp()) : null;
