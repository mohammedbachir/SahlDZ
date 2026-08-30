import { getFirebaseApp } from "@/integrations/firebase/config";
import {
  isSupported,
  getMessaging,
  getToken,
  onMessage,
} from "firebase/messaging";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

let messagingInstance: any = null;

export async function initializeFCM(): Promise<string | null> {
  try {
    const app = getFirebaseApp();
    if (!app) return null;

    const supported = await isSupported();
    if (!supported) return null;

    messagingInstance = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    let swRegistration: ServiceWorkerRegistration | undefined;
    try {
      swRegistration =
        (await navigator.serviceWorker.register("/firebase-messaging-sw.js")) ??
        undefined;
    } catch (err) {
      console.warn("FCM SW registration failed:", err);
    }

    const token = await getToken(messagingInstance, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "",
      serviceWorkerRegistration: swRegistration,
    });
    return token;
  } catch (err) {
    console.warn("FCM init failed:", err);
    return null;
  }
}

export async function saveFCMToken(
  restaurantId: string,
  token: string,
): Promise<void> {
  try {
    const app = getFirebaseApp();
    if (!app) return;
    const db = getFirestore(app);

    const tokensRef = collection(db, "fcm_tokens");
    const q = query(tokensRef, where("token", "==", token));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref);
    }

    await addDoc(tokensRef, {
      restaurant_id: restaurantId,
      token,
      platform: "web",
      created_at: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to save FCM token:", err);
  }
}

export function onForegroundMessage(
  callback: (payload: {
    title: string;
    body: string;
    data: Record<string, string>;
  }) => void,
): () => void {
  if (!messagingInstance) return () => {};

  const unsubscribe = onMessage(messagingInstance, (payload) => {
    callback({
      title: payload.notification?.title || "",
      body: payload.notification?.body || "",
      data: (payload.data as Record<string, string>) || {},
    });
  });

  return unsubscribe;
}

export async function removeFCMToken(token: string): Promise<void> {
  try {
    const app = getFirebaseApp();
    if (!app) return;
    const db = getFirestore(app);

    const tokensRef = collection(db, "fcm_tokens");
    const q = query(tokensRef, where("token", "==", token));
    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }
  } catch (err) {
    console.warn("Failed to remove FCM token:", err);
  }
}
