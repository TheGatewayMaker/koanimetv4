import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Mutable config so we can hydrate from runtime if build-time envs are missing
let config: {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
} = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as
    | string
    | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    | string
    | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as
    | string
    | undefined,
};

export function isFirebaseConfigured() {
  return !!(
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.appId
  );
}

let runtimeConfigTried = false;
async function fetchRuntimeConfig(): Promise<boolean> {
  if (isFirebaseConfigured()) return true;
  if (runtimeConfigTried) return isFirebaseConfigured();
  runtimeConfigTried = true;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch("/api/firebase/config", { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return false;
    const data = await res.json();
    const cfg = data?.config || {};
    if (cfg?.apiKey && cfg?.authDomain && cfg?.projectId && cfg?.appId) {
      config = { ...config, ...cfg };
      if (typeof window !== "undefined")
        // @ts-ignore debug helper
        (window as any).__FIREBASE_CONFIG__ = { ...config };
      return true;
    }
  } catch {}
  return isFirebaseConfigured();
}

export function getFirebase(): { app: FirebaseApp; auth: Auth } {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Please set env variables.");
  }
  const app = getApps().length ? getApps()[0] : initializeApp(config as any);
  const auth = getAuth(app);
  return { app, auth };
}

export async function getFirebaseAsync(): Promise<{
  app: FirebaseApp;
  auth: Auth;
} | null> {
  if (!isFirebaseConfigured()) {
    const ok = await fetchRuntimeConfig();
    if (!ok) return null;
  }
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(config as any);
    const auth = getAuth(app);
    return { app, auth };
  } catch {
    return null;
  }
}

let analyticsPromise: Promise<Analytics | null> | null = null;
export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null);
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((ok) => (ok ? getAnalytics(getApps()[0]!) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}
