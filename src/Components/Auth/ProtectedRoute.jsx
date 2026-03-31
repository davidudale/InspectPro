import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser;
      if (user) {
        setHasUser(true);
        const docSnap = await getDoc(doc(db, "users", user.uid));
        const userData = docSnap.data() || {};
        const normalizedReviewerType = String(userData.reviewerType || "").trim();
        const normalizedRole =
          normalizedReviewerType ? "External_Reviewer" : userData.role || null;
        setRole(normalizedRole);
      }
      setLoading(false);
    };
    checkRole();
  }, []);

  if (loading)
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (!hasUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
    return children;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default ProtectedRoute;
