import React from "react";
import {
  BadgeCheck,
  Building2,
  Bug,
  LogOut,
  ClipboardList,
  ClipboardPlus,
  FileClock,
  FileText,
  FolderKanban,
  FolderOpen,
  LayoutDashboard,
  MapPin,
  Users,
  Settings,
  LifeBuoy,
  ChevronDown,
  Menu,
  X,
  UserCircle2,
  Wrench,
  Sliders,
  Shield,
} from "lucide-react"; // Example icons
import { useState, useEffect } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../Auth/firebase"; // Ensure auth is exported from your firebase config
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "../../Auth/AuthContext";

const sidebarLinks = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    href: "/ManagerDashboard",
  },

  {
    name: "Pending Approval",
    icon: <FileClock size={20} />,
    href: "/Pending_approval",
  },
  {
    name: "Approved Projects",
    icon: <BadgeCheck size={20} />,
    href: "/approval_projects",
  },
  {
    name: "Report Manager",
    icon: <FileText size={20} />,
    subLinks: [
      {
        name: "360° Inspection Summary",
        icon: <FileText size={16} />,
        href: "/reports/daily-inspection-summary",
      },
    ],
  },
  {
    name: "Support",
    icon: <LifeBuoy size={20} />,
    subLinks: [
      {
        name: "Issue Log",
        icon: <Bug size={16} />,
        href: "/support/issues",
      },
    ],
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
      {
        name: "Next Inspection Scheduler",
        icon: <ClipboardList size={16} />,
        href: "/next-inspections",
      },
    ],
  },
  {
    name: "Profile",
    icon: <UserCircle2 size={20} />,
    subLinks: [
      {
        name: "Profile & Security",
        icon: <Shield size={16} />,
        href: "/profile/security",
      },
      {
        name: "Sign Out",
        icon: <LogOut size={16} />,
        action: "logout",
      },
    ],
  },
];

const ManagerSidebar = () => {
  const { logout } = useAuth();
  const [fullName, setFullName] = useState(""); // State for logged-in user's name
  const navigate = useNavigate();
  const location = useLocation();
  // State to track which dropdown is open (by name)
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };
  const toggleMobileMenu = () => {
    setIsMobileExpanded((prev) => !prev);
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

  const handleLogout = async () => {
    await logout();
    setIsMobileExpanded(false);
    navigate("/login");
  };

  const handleSubLinkClick = async (subLink) => {
    if (subLink.action === "logout") {
      await handleLogout();
      return;
    }

    navigate(subLink.href);
    setIsMobileExpanded(false);
  };

  return (
    <>
    <div
      onClick={() => setIsMobileExpanded(false)}
      className={`fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
        isMobileExpanded ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    />
    <aside
      className={`fixed z-40 flex h-screen max-w-[85vw] flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-xl transition-all duration-300 ${
        isMobileExpanded ? "w-64 shadow-2xl shadow-black/40" : "w-16"
      } lg:w-64`}
    >
      <div className="p-4 lg:p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <button
                        type="button"
                        onClick={toggleMobileMenu}
                        className="ml-auto mb-4 relative lg:hidden p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                        aria-label="Toggle sidebar"
                      >
                        {isMobileExpanded ? <X size={16} /> : <Menu size={16} />}
                      </button>
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
          
        </div>
      </div>
      {/* Example Sidebar Icons for Mobile */}
      <nav className="flex-1 overflow-y-auto bg-slate-900 px-3 py-4 space-y-1">
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
                    hasSubLinks ? toggleDropdown(link.name) : (navigate(link.href), setIsMobileExpanded(false))
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

                {/* Chevron Icon for Dropdowns */}
                {hasSubLinks && (
                  <ChevronDown
                    size={16}
                    className={`${isMobileExpanded ? "block" : "hidden"} lg:block transition-transform duration-300 ${isOpen ? "rotate-180 text-orange-500" : ""}`}
                  />
                )}
              </div>

              {/* Dropdown Content */}
              {hasSubLinks && isOpen && (
                <div className={`${isMobileExpanded ? "block" : "hidden"} lg:block ml-9 mt-1 space-y-1 border-l border-slate-800`}>
                  {link.subLinks.map((sub, subIdx) => (
                    <button
                      key={subIdx}
                      onClick={() => handleSubLinkClick(sub)}
                      className={`w-full flex items-center gap-3 pl-4 py-2 text-xs font-medium rounded-r-lg transition-all
                        ${
                          sub.href && location.pathname === sub.href
                            ? "text-orange-500 bg-orange-500/5 border-l-2 border-orange-500"
                            : sub.action === "logout"
                              ? "text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
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
    </>
  );
};

export default ManagerSidebar;
