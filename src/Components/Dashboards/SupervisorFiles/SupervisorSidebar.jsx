import React from "react";
import {
  BadgeCheck,
  FileClock,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Sliders,
} from "lucide-react"; // Example icons
import { useState, useEffect } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../Auth/firebase"; // Ensure auth is exported from your firebase config
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const sidebarLinks = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    href: "/SupervisorDashboard",
  },
  {
    name: "Pending Inspections",
    icon: <FileClock size={20} />,
    href: "/SubInspection_view",
  },
   {
    name: "Confirmed Inspection",
    icon: <BadgeCheck size={20} />,
    href: "/ConfirmedInspection",
  },
 
  {
    name: "System Setup",
    icon: <Settings size={20} />,
    subLinks: [
          {
        name: "System Config",
        icon: <Sliders size={16} />,
        href: "/admin/config",
      },
    ],
  },
];

const SupervisorSidebar = () => {
  const [fullName, setFullName] = useState(""); // State for logged-in user's name
  const navigate = useNavigate();
  const location = useLocation();
  // State to track which dropdown is open (by name)
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Fetch logged-in user's Full Name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            // Assuming your Firestore field is called 'fullName'
            setFullName(
              docSnap.data().fullName || docSnap.data().name || "Admin",
            );
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <aside className="w-16 h-screen lg:w-64 fixed border-r border-slate-800 bg-slate-900/20 transition-all duration-300 flex flex-col">
      <div className="p-4 lg:p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 p-0.5 shadow-orange-500/20">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white font-bold text-xs lg:text-base">
                AV
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
          </div>
          <div className="hidden lg:block overflow-hidden">
            <p className="text-sm font-bold text-white uppercase tracking-tight truncate">
              {fullName || "Admin"}
            </p>
          </div>
        </div>
      </div>
      {/* Example Sidebar Icons for Mobile */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sidebarLinks.map((link, index) => {
          const hasSubLinks = !!link.subLinks;
          const isOpen = openDropdown === link.name;
          const isSubLinkActive = hasSubLinks
            ? link.subLinks.some((sub) => location.pathname === sub.href)
            : false;
          const isActive = location.pathname === link.href || isSubLinkActive;

          return (
            <div key={index} className="w-full">
              {/* Main Link or Dropdown Trigger */}
              <div
                onClick={() =>
                  hasSubLinks ? toggleDropdown(link.name) : navigate(link.href)
                }
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group
                  ${isActive ? "bg-orange-600/10 text-orange-500" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`${isActive ? "text-orange-500" : "group-hover:text-orange-500"} transition-colors`}
                  >
                    {link.icon}
                  </div>
                  <span className="hidden lg:block text-sm font-semibold tracking-wide">
                    {link.name}
                  </span>
                </div>

                {/* Chevron Icon for Dropdowns */}
                {hasSubLinks && (
                  <ChevronDown
                    size={16}
                    className={`hidden lg:block transition-transform duration-300 ${isOpen ? "rotate-180 text-orange-500" : ""}`}
                  />
                )}
              </div>

              {/* Dropdown Content */}
              {hasSubLinks && isOpen && (
                <div className="hidden lg:block ml-9 mt-1 space-y-1 border-l border-slate-800">
                  {link.subLinks.map((sub, subIdx) => (
                    <button
                      key={subIdx}
                      onClick={() => navigate(sub.href)}
                      className={`w-full flex items-center gap-3 pl-4 py-2 text-xs font-medium rounded-r-lg transition-all
                        ${
                          location.pathname === sub.href
                            ? "text-orange-500 bg-orange-500/5 border-l-2 border-orange-500"
                            : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/30"
                        }`}
                    >
                      <span>{sub.icon}</span>
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default SupervisorSidebar;
