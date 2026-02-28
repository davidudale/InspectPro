import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth, db } from '../Auth/firebase'; // Import your Firestore 'db' instance
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore methods

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const inactivityLimitMs = 15 * 60 * 1000;
  const warningOffsetMs = 1 * 60 * 1000;
  const resetTimerRef = useRef(null);

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
              // Map exactly what is in your database (e.g., 'Inspector', 'Lead Inspector', 'Admin')
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

  useEffect(() => {
    if (!user) {
      return;
    }

    let timeoutId = null;
    let warningId = null;
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (warningId) {
        clearTimeout(warningId);
      }
      if (showTimeoutWarning) {
        setShowTimeoutWarning(false);
      }
      warningId = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, Math.max(0, inactivityLimitMs - warningOffsetMs));
      timeoutId = setTimeout(async () => {
        await auth.signOut();
        setUser(null);
      }, inactivityLimitMs);
    };
    resetTimerRef.current = resetTimer;

    events.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (warningId) {
        clearTimeout(warningId);
      }
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, inactivityLimitMs, warningOffsetMs, showTimeoutWarning]);

  return (
    <AuthContext.Provider value={{ user, logout, loading }}>
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">
              Session expiring soon
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              You will be signed out in 1 minute due to inactivity.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => resetTimerRef.current && resetTimerRef.current()}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-orange-600 hover:bg-orange-500 transition-colors"
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      )}
      {!loading && children} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
