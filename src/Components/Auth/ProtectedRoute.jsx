import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const role = user?.role || null;
  const hasUser = Boolean(user?.uid);
  const emailVerified = Boolean(user?.emailVerified);
  const isPasswordChangeRoute = location.pathname === "/profile/security";

  if (loading)
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (!hasUser) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "Admin" && !emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (user?.mustChangePassword && !isPasswordChangeRoute) {
    return <Navigate to="/profile/security" replace state={{ forcedPasswordChange: true }} />;
  }

  if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
    return children;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default ProtectedRoute;
