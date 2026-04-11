import { React, useState, useEffect } from "react";
import { Menu, X, FileText, LogOut, User } from "lucide-react";
import { auth } from "../../Auth/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../utils/toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext";
import MessageBell from "../../Common/MessageBell";

const ExternalNavbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("Guest");
  const [userFname, setUserFname] = useState("");

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || "Guest");
        setUserFname(
          user.displayName || user.email?.split("@")[0] || "Reviewer",
        );
      }
    });
    return () => unsubscribe();
  }, []);

  const roleLabel =
    user?.role === "External_Reviewer" ? "External Reviewer" : "Lead Inspector";
  const reviewerTypeLabel =
    user?.role === "External_Reviewer" && user?.reviewerType
      ? String(user.reviewerType).replaceAll("_", " ")
      : "";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
      toast.success("Signed out successfully.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to sign out."));
    }
  };
  return (
    <>
    <nav className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-800 bg-slate-900/85 backdrop-blur-md">
      <div className="flex items-center justify-between p-4 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-sm flex items-center justify-center transform rotate-45">
            <div className="w-3 h-3 bg-white rounded-full -rotate-45"></div>
          </div>
          <span className="text-xl lg:text-2xl font-bold tracking-tighter text-white">
            InspectProEdge.<span className="text-orange-500">.</span>
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center space-x-4">
          <MessageBell user={user} />
          <div className="flex flex-col items-end mr-2">
              {/* Displaying the actual user email instead of a hardcoded string */}
            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">
              {reviewerTypeLabel ? `External Reviewer - ${reviewerTypeLabel}` : "External Reviewer"}
            </span>
            <span className="text-white text-xs font-medium">{userEmail}</span>
          </div>
         
          <button className="bg-red-900/40 hover:bg-red-700 text-white px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-widest transition-all" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 p-4 space-y-4 flex flex-col">
          <button className="w-full text-left px-2 py-2 text-sm text-slate-300">
            {reviewerTypeLabel ? `${roleLabel} - ${reviewerTypeLabel}` : roleLabel}
          </button>
          <button className="w-full bg-orange-600 text-white p-2 rounded-sm text-xs font-bold uppercase">
            Start Inspection
          </button>
          <button
            className="w-full bg-red-900 text-white p-2 rounded-sm text-xs font-bold uppercase"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
    <div className="h-[73px] w-full shrink-0" />
    </>
  );
};

export default ExternalNavbar;
