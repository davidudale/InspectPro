import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth, db, rtdb } from '../Auth/firebase'; // Import your Firebase instances
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'; // Import Firestore methods
import {
  onDisconnect,
  onValue,
  ref as rtdbRef,
  serverTimestamp as rtdbServerTimestamp,
  set as setRtdbValue,
} from 'firebase/database';

const AuthContext = createContext(null);
const PRESENCE_HEARTBEAT_MS = 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const inactivityLimitMs = 15 * 60 * 1000;
  const warningOffsetMs = 1 * 60 * 1000;
  const resetTimerRef = useRef(null);

  const updatePresenceDocument = async (uid, payload) => {
    if (!uid) return;
    try {
      await setDoc(doc(db, "users", uid), payload, { merge: true });
    } catch (error) {
      console.error("Error updating presence document:", error);
    }
  };

  const markUserOffline = async (uid, email = "") => {
    if (!uid) return;

    await Promise.allSettled([
      updatePresenceDocument(uid, {
        isOnline: false,
        presenceState: "offline",
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      setRtdbValue(rtdbRef(rtdb, `status/${uid}`), {
        uid,
        email,
        state: "offline",
        lastChanged: rtdbServerTimestamp(),
      }),
    ]);
  };

  useEffect(() => {
    // Force sign-out on app start (aggressive: clears any persisted session)
    auth.signOut().catch((error) => {
      console.error("Error forcing sign-out:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // --- NEW: Fetch dynamic role from Firestore ---
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const normalizedReviewerType = String(userData.reviewerType || "").trim();
            const normalizedRole =
              normalizedReviewerType ? "External_Reviewer" : (userData.role || "Inspector");
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName || userData.name || "",
              ...userData, // Spreads other profile fields if needed
              // Treat reviewerType-backed users as external reviewers for shared access control.
              role: normalizedRole,
              reviewerType: normalizedReviewerType,
            });
          } else {
            // Fallback if auth exists but Firestore profile is missing
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: null
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

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const uid = user.uid;
    const email = user.email || "";
    const userStatusRef = rtdbRef(rtdb, `status/${uid}`);
    const connectedRef = rtdbRef(rtdb, ".info/connected");
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    let lastActivityPing = 0;

    const syncRecentActivity = async () => {
      const now = Date.now();
      if (now - lastActivityPing < PRESENCE_HEARTBEAT_MS) {
        return;
      }

      lastActivityPing = now;
      await updatePresenceDocument(uid, {
        lastSeen: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    };

    const handleActivity = () => {
      syncRecentActivity();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncRecentActivity();
      }
    };

    const unsubscribeConnection = onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() === false) {
        await updatePresenceDocument(uid, {
          isOnline: false,
          presenceState: "offline",
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      try {
        await onDisconnect(userStatusRef).set({
          uid,
          email,
          state: "offline",
          lastChanged: rtdbServerTimestamp(),
        });

        await setRtdbValue(userStatusRef, {
          uid,
          email,
          state: "online",
          lastChanged: rtdbServerTimestamp(),
        });

        await updatePresenceDocument(uid, {
          isOnline: true,
          presenceState: "online",
          lastSeen: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error syncing live presence:", error);
      }
    });

    activityEvents.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const heartbeatId = window.setInterval(() => {
      syncRecentActivity();
    }, PRESENCE_HEARTBEAT_MS);

    syncRecentActivity();

    return () => {
      window.clearInterval(heartbeatId);
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeConnection();
      markUserOffline(uid, email);
    };
  }, [user?.uid, user?.email]);

  const logout = async () => {
    await markUserOffline(user?.uid, user?.email || "");
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
        await markUserOffline(user?.uid, user?.email || "");
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
