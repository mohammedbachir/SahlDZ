import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as
    string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

// Local development against the Firebase Emulator Suite.
// Set VITE_USE_FIREBASE_EMULATORS=1 (plus any dummy VITE_FIREBASE_* value)
// to run the full app without a real backend.
const USE_EMULATORS = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "1";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!USE_EMULATORS && !firebaseConfig.apiKey) return null;
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!auth) {
    auth = getAuth(a);
    if (USE_EMULATORS) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!db) {
    db = getFirestore(a);
    if (USE_EMULATORS) {
      connectFirestoreEmulator(db, "127.0.0.1", 8081);
    }
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!storage) {
    storage = getStorage(a);
    if (USE_EMULATORS) {
      connectStorageEmulator(storage, "127.0.0.1", 9199);
    }
  }
  return storage;
}
