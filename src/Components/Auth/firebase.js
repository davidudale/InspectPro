import { initializeApp } from "firebase/app";
import { browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAFD-VFAivkpk2aTV84q2sSZm-SEz_PfRc",
  authDomain: "inspectpro-715dc.firebaseapp.com",
  projectId: "inspectpro-715dc",
  databaseURL: "https://inspectpro-715dc-default-rtdb.firebaseio.com",
  storageBucket: "inspectpro-715dc.firebasestorage.app",
  messagingSenderId: "332746707581",
  appId: "1:332746707581:web:0f66c04ecf630bc99a1714",
};

// Main App Instance (for Admin login session)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
let resolvedDb;
try {
  const isBrowser = typeof window !== "undefined";
  resolvedDb = isBrowser
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      })
    : getFirestore(app);
} catch (error) {
  console.warn("Falling back to default Firestore configuration:", error);
  resolvedDb = getFirestore(app);
}
export const db = resolvedDb;
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

// Secondary Instance (for User Management ONLY)
// We give it a unique name "Secondary" so it doesn't conflict with the main session
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export const authPersistenceReady = Promise.all([
  setPersistence(auth, browserSessionPersistence),
  setPersistence(secondaryAuth, browserSessionPersistence),
]).catch((error) => {
  console.error("Failed to apply session-only auth persistence:", error);
});
