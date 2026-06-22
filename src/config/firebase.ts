import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import type { Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
};

// Check if all essential keys are present
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let dbInstance: Firestore | null = null;
let rtdbInstance: Database | null = null;
let appInstance: FirebaseApp | null = null;

if (isFirebaseConfigured) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    dbInstance = initializeFirestore(appInstance, { localCache: persistentLocalCache() });
    rtdbInstance = getDatabase(appInstance);
  } catch (error) {
    console.error("Error initializing Firebase: ", error);
  }
} else {
  console.warn(
    "Firebase is not configured. The app will run in MOCK LOCAL MULTIPLAYER MODE.\n" +
    "To use real-time online multiplayer, create a `.env.local` file in the root with VITE_FIREBASE_* variables."
  );
}

export const db = dbInstance;
export const rtdb = rtdbInstance;
export const app = appInstance;
