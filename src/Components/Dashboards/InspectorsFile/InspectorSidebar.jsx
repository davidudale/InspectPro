import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Sliders,
  FileText,
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../Auth/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const sidebarLinks = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    href: "/inspectionDashboard",
  },
  {
    name: "Inspections",
    icon: <ClipboardList size={20} />,
    href: "/Inspection_view",
  },

  {
    name: "System Setup",
    icon: <Settings size={20} />,
    subLinks: [
      {
        name: "Preferences",
        icon: <Sliders size={16} />,
        href: "/inspector/settings",
      },
    ],
  },
  {
    name: "Report Manager",
    icon: <FileText size={20} />,
    subLinks: [
      {
        name: "Daily Inspection Summary",
        icon: <FileText size={16} />,
        href: "/reports/daily-inspection-summary",
      },
      {
        name: "Inspection Progress Report",
        icon: <FileText size={16} />,
        href: "/reports/inspection-progress",
      },
      {
        name: "Non-Conformance Report",
        icon: <FileText size={16} />,
        href: "/reports/non-conformance",
      },
      {
        name: "Corrective Action Report",
        icon: <FileText size={16} />,
        href: "/reports/corrective-action",
      },
      {
        name: "Equipment Status Report",
        icon: <FileText size={16} />,
        href: "/reports/equipment-status",
      },
      {
        name: "Personnel Activity Report",
        icon: <FileText size={16} />,
        href: "/reports/personnel-activity",
      },
      {
        name: "Safety Report",
        icon: <FileText size={16} />,
        href: "/reports/safety",
      },
      {
        name: "Next Day Plan",
        icon: <FileText size={16} />,
        href: "/reports/next-day-plan",
      },
    ],
  },
];

const InspectorSidebar = () => {
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setFullName(
              docSnap.data().fullName || docSnap.data().name || "Inspector",
            );
          } else {
            setFullName(user.displayName || user.email || "Inspector");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setFullName(user.displayName || user.email || "Inspector");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const isPathActive = (href) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

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
              {fullName || "Inspector"}
            </p>
          </div>
        </div>
      </div>
      {/* Example Sidebar Icons for Mobile */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sidebarLinks.map((link) => {
          const hasSubLinks = !!link.subLinks;
          const isOpen = openDropdown === link.name;
          const isActive = hasSubLinks
            ? link.subLinks.some((sub) => isPathActive(sub.href))
            : isPathActive(link.href);

          return (
            <div key={link.name} className="w-full">
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
                  {link.subLinks.map((sub) => (
                    <button
                      key={sub.name}
                      onClick={() => navigate(sub.href)}
                      className={`w-full flex items-center gap-3 pl-4 py-2 text-xs font-medium rounded-r-lg transition-all
                        ${
                          isPathActive(sub.href)
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

export default InspectorSidebar;
