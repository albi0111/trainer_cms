import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, memoryLocalCache } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByV5Ou9c8hRkN7Koy6O__DFnz3FvV6g58",
  authDomain: "fitpersona-beb36.firebaseapp.com",
  projectId: "fitpersona-beb36",
  storageBucket: "fitpersona-beb36.firebasestorage.app",
  messagingSenderId: "954607109363",
  appId: "1:954607109363:web:475b75d9f1380ff92be386",
  measurementId: "G-B82114CT7J"
};

const app = initializeApp(firebaseConfig);

import { Platform } from 'react-native';

// persistentLocalCache enables offline-first behavior on React Native.
// On Web, persistentLocalCache causes IndexedDB lock contention during hot-reloads,
// resulting in 10+ second hangs on startup. We fallback to memoryLocalCache for web preview.
export const db = initializeFirestore(app, {
  localCache: Platform.OS === 'web' ? memoryLocalCache() : persistentLocalCache(),
});
