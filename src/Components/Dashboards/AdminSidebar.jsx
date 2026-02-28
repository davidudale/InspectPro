import React, { useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  ClipboardPlus,
  FolderKanban,
  FolderOpen,
  LayoutDashboard,
  MapPin,
  FileText,
  Users,
  Settings,
  ChevronDown,
  Menu,
  X,
  Wrench,
  Sliders,
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../Auth/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const sidebarLinks = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    href: "/admin-dashboard",
  },

  {
    name: "Project Management",
    icon: <FolderKanban size={20} />,
    // This item has a dropdown
    subLinks: [
      {
        name: "View Projects",
        icon: <FolderOpen size={16} />,
        href: "/admin/projects",
      },
      {
        name: "Add Projects",
        icon: <ClipboardPlus size={16} />,
        href: "/projects",
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
        name: "Inspection Progress",
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

  {
    name: "System Setup",
    icon: <Settings size={20} />,
    subLinks: [
      {
        name: "Company Profile",
        icon: <Building2 size={16} />,
        href: "/admin/company-profile",
      },
      {
        name: "Client Management",
        icon: <Building2 size={16} />,
        href: "/Client",
      },
      {
        name: "Location Management",
        icon: <MapPin size={16} />,
        href: "/location",
      },
      {
        name: "Equipment Management",
        icon: <Wrench size={16} />,
        href: "/equipment",
      },
      {
        name: "Inspection Types",
        icon: <ClipboardList size={16} />,
        href: "/inspection_type",
      },
      
      {
        name: "Report Template",
        icon: <FolderOpen size={16} />,
        href: "/admin/inspections",
      },
      {
        name: "User Management",
        icon: <Users size={20} />,
        href: "/admin/users",
      },
      {
        name: "System Config",
        icon: <Sliders size={16} />,
        href: "/admin/config",
      },
    ],
  },
  
];

const AdminSidebar = () => {
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };
  const toggleMobileMenu = () => {
    setIsMobileExpanded((prev) => !prev);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
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

  const isPathActive = (href) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className={`h-screen fixed border-r border-slate-800 bg-slate-900/20 transition-all duration-300 flex flex-col ${
        isMobileExpanded ? "w-64" : "w-16"
      } lg:w-64`}
    >
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
          <div className={`${isMobileExpanded ? "block" : "hidden"} lg:block overflow-hidden`}>
            <p className="text-sm font-bold text-white uppercase tracking-tight truncate">
              {fullName || "Admin"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="ml-auto lg:hidden p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            aria-label="Toggle sidebar"
          >
            {isMobileExpanded ? <X size={16} /> : <Menu size={16} />}
          </button>
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
                  <span
                    className={`${isMobileExpanded ? "block" : "hidden"} lg:block text-sm font-semibold tracking-wide`}
                  >
                    {link.name}
                  </span>
                </div>

                {hasSubLinks && (
                  <ChevronDown
                    size={16}
                    className={`${isMobileExpanded ? "block" : "hidden"} lg:block transition-transform duration-300 ${isOpen ? "rotate-180 text-orange-500" : ""}`}
                  />
                )}
              </div>

              {hasSubLinks && isOpen && (
                <div className={`${isMobileExpanded ? "block" : "hidden"} lg:block ml-9 mt-1 space-y-1 border-l border-slate-800`}>
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

export default AdminSidebar;
