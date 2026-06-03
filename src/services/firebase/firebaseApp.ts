import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFunctions, type Functions } from 'firebase/functions';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

let app: FirebaseApp | null = null;
let messagingSupportPromise: Promise<boolean> | null = null;

function readFirebaseConfig(): FirebaseOptions {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };
}

function assertFirebaseConfig(config: FirebaseOptions): void {
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(', ')}`);
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }

  const config = readFirebaseConfig();
  assertFirebaseConfig(config);
  app = getApps()[0] || initializeApp(config);
  return app;
}

export function getFirebaseFunctionsInstance(): Functions {
  const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
  return getFunctions(getFirebaseApp(), region);
}

export async function getFirebaseMessagingInstance(): Promise<Messaging> {
  if (!messagingSupportPromise) {
    messagingSupportPromise = isSupported();
  }

  if (!await messagingSupportPromise) {
    throw new Error('Firebase Messaging is not supported on this browser.');
  }

  return getMessaging(getFirebaseApp());
}

export function getFirebaseVapidKey(): string {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
  if (!vapidKey) {
    throw new Error('Missing VITE_FIREBASE_VAPID_KEY.');
  }
  return vapidKey;
}
