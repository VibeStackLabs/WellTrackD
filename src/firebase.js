import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(), // Sync across tabs
    cacheSizeBytes: CACHE_SIZE_UNLIMITED, // Store as much as needed
  }),
});

// Initialize Auth
export const auth = getAuth(app);

// Offline support initialization (for backward compatibility)
export const enableOfflineSupport = async () => {
  try {
    // Firestore persistence is automatically enabled via initializeFirestore
    console.log("✅ Firestore offline persistence enabled");

    // Log browser support
    if ("indexedDB" in window) {
      console.log("📦 IndexedDB available for persistent storage");
    } else {
      console.warn("⚠️ IndexedDB not available - offline features limited");
    }

    return Promise.resolve();
  } catch (error) {
    console.error("❌ Failed to initialize offline support:", error);
    // Still resolve so app continues working
    return Promise.resolve();
  }
};

// Network status utility
export const isOnline = () => navigator.onLine;

// Connection quality check
export const getConnectionInfo = () => {
  if (!navigator.connection) return { online: navigator.onLine };

  return {
    online: navigator.onLine,
    type: navigator.connection.type,
    effectiveType: navigator.connection.effectiveType,
    downlink: navigator.connection.downlink,
    rtt: navigator.connection.rtt,
    saveData: navigator.connection.saveData,
  };
};
