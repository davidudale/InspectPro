import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAFD-VFAivkpk2aTV84q2sSZm-SEz_PfRc",
  authDomain: "inspectpro-715dc.firebaseapp.com",
  projectId: "inspectpro-715dc",
  storageBucket: "inspectpro-715dc.firebasestorage.app",
  messagingSenderId: "332746707581",
  appId: "1:332746707581:web:0f66c04ecf630bc99a1714",
};

// Main App Instance (for Admin login session)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Secondary Instance (for User Management ONLY)
// We give it a unique name "Secondary" so it doesn't conflict with the main session
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
