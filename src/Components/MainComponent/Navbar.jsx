import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";

const getDashboardPathByRole = (role) => {
  switch (role) {
    case "Admin":
      return "/admin-dashboard";
    case "Manager":
      return "/ManagerDashboard";
    case "Lead Inspector":
    case "Supervisor":
      return "/SupervisorDashboard";
    default:
      return "/inspectionDashboard";
  }
};

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const navLinks = [
    { name: "Solutions", href: "#services" },
    { name: "Sustainability", href: "#sustainability" },
    { name: "Projects", href: "#" },
    { name: "Investors", href: "#" },
    { name: "News", href: "#news" },
  ];

  const userLabel =
    user?.displayName ||
    user?.name ||
    user?.fullName ||
    user?.email?.split("@")[0] ||
    "Account";

  const handleAccountAction = () => {
    if (user) {
      navigate(getDashboardPathByRole(user.role));
      return;
    }
    navigate("/login");
  };

  return (
    <nav className="fixed p-2 top-0 left-0 w-full z-100 transition-all duration-300 bg-dark-900/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-sm flex items-center justify-center transform rotate-45">
                <div className="w-3 h-3 bg-white rounded-full -rotate-45"></div>
              </div>
              <span className="text-2xl font-syncopate font-bold tracking-tighter text-white">
                InspectPro<span className="text-orange-500">.</span>
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-300 hover:text-orange-500 transition-colors uppercase tracking-widest"
              >
                {link.name}
              </a>
            ))}

            {user && (
              <span className="text-slate-300 text-xs font-semibold uppercase tracking-widest">
                {userLabel}
              </span>
            )}

            <button
              onClick={handleAccountAction}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-sm text-sm font-bold uppercase tracking-widest transition-all transform hover:scale-105"
            >
              {user ? "Dashboard" : "Login"}
            </button>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-300 hover:text-white p-2"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    mobileMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden glass-effect border-t border-slate-800">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block px-3 py-4 text-base font-medium text-slate-300 hover:text-orange-500 border-b border-slate-800/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}

            {user && (
              <div className="px-3 py-2 text-slate-300 text-xs font-semibold uppercase tracking-widest">
                Signed in as {userLabel}
              </div>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleAccountAction();
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-sm text-sm font-bold uppercase tracking-widest transition-all transform hover:scale-105"
            >
              {user ? "Dashboard" : "Login"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
