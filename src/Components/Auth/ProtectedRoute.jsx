import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        setRole(docSnap.data()?.role);
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

  return allowedRoles.includes(role) ? children : <Navigate to="/login" />;

  const hasAccess = allowedRoles.includes(role);

  if (!hasAccess) {
    // Keep them logged in, but deny entry to this specific route
    return <Navigate to="/unauthorized" replace />;
  }
};

export default ProtectedRoute;
