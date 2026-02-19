import { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../Auth/firebase'; // Import your Firestore 'db' instance
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore methods

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // --- NEW: Fetch dynamic role from Firestore ---
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName || userData.name || "",
              // Map exactly what is in your database (e.g., 'Inspector', 'Supervisor', 'Admin')
              role: userData.role || 'Inspector', 
              ...userData // Spreads other profile fields if needed
            });
          } else {
            // Fallback if auth exists but Firestore profile is missing
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'Guest'
            });
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, logout, loading }}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
