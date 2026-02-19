import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAsMXCIkG1N4yWWQp0QKpkLhf23_eOednU",
  authDomain: "inspectionapp-f5d54.firebaseapp.com",
  projectId: "inspectionapp-f5d54",
  storageBucket: "inspectionapp-f5d54.firebasestorage.app",
  messagingSenderId: "494949815374",
  appId: "1:494949815374:web:c70da823340a29057a9f1f"
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