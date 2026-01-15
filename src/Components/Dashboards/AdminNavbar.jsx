import { React, useState, useEffect } from "react";
import { Menu, X, FileText, LogOut, User } from "lucide-react";
import { auth, db } from "../Auth/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";

const AdminNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("Guest");
  const [userFname, setUserFname] = useState("");

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
    
        setUserEmail(user.email);
        setUserFname(user.fname);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
      toast.success("Logged out successfully");
      // Optional: Redirect to login page using window.location or a router
      window.location.href = "/login";
    } catch (error) {
      toast.error("Error signing out: " + error.message);
    }
  };
  return (
    <nav className="sticky top-0 w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-50">
      <div className="flex items-center justify-between p-4 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-sm flex items-center justify-center transform rotate-45">
            <div className="w-3 h-3 bg-white rounded-full -rotate-45"></div>
          </div>
          <span className="text-xl lg:text-2xl font-bold tracking-tighter text-white">
            InspectPro<span className="text-orange-500">.</span>
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex flex-col items-end mr-2">
             {/* Displaying the actual user email instead of a hardcoded string */}
            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">{userFname}</span>
            <span className="text-white text-xs font-medium">{userEmail}</span>
          </div>
          
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-widest transition-all hover:scale-105">
            Generate Report
          </button>
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
            Supervisor
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
  );
};

export default AdminNavbar;
