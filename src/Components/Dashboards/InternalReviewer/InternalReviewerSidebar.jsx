import React from "react";
import {
  ClipboardCheck,
  ChevronDown,
  FileSearch,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PackageSearch,
  Shield,
  UserCircle2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarUserMenu from "../SidebarUserMenu";
import { useAuth } from "../../Auth/AuthContext";

const sidebarLinks = [
  { name: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/internal-reviewer" },
  {
    name: "Projects",
    icon: <FileSearch size={20} />,
    href: "/internal-reviewer/projects",
  },
  {
    name: "Reviews",
    icon: <ClipboardCheck size={20} />,
    href: "/internal-reviewer/reviews",
  },
  {
    name: "Equipments",
    icon: <PackageSearch size={20} />,
    href: "/internal-reviewer/equipments",
  },
  {
    name: "Issues",
    icon: <LifeBuoy size={20} />,
    href: "/internal-reviewer/issues",
  },
  {
    name: "Profile",
    icon: <UserCircle2 size={20} />,
    subLinks: [
      { name: "Profile & Security", icon: <Shield size={16} />, href: "/profile/security" },
      { name: "Sign Out", icon: <LogOut size={16} />, action: "logout" },
    ],
  },
];

const InternalReviewerSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = React.useState(null);
  const [isMobileExpanded, setIsMobileExpanded] = React.useState(false);

  const isPathActive = (href) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    await logout();
    setIsMobileExpanded(false);
    navigate("/login");
  };

  const handleNavigate = (href) => {
    navigate(href);
    setIsMobileExpanded(false);
  };

  const handleSubLinkClick = async (subLink) => {
    if (subLink.action === "logout") {
      await handleLogout();
      return;
    }
    handleNavigate(subLink.href);
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
        <div className="border-b border-slate-800/50 p-4 lg:p-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileExpanded((prev) => !prev)}
              className="relative rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:bg-slate-800/50 hover:text-white lg:hidden"
              aria-label="Toggle sidebar"
            >
              {isMobileExpanded ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white">
              IR
            </div>
            <div className={`${isMobileExpanded ? "block" : "hidden"} overflow-hidden lg:block`}>
              <p className="truncate text-sm font-bold uppercase tracking-tight text-white">
                Internal Reviewer
              </p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Review Desk
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto bg-slate-900 px-3 py-4">
          {sidebarLinks.map((link) => {
            const hasSubLinks = Boolean(link.subLinks);
            const isOpen = openDropdown === link.name;
            const isActive = hasSubLinks
              ? link.subLinks.some((sub) => isPathActive(sub.href))
              : isPathActive(link.href);

            return (
              <div key={link.name} className="w-full">
                <button
                  type="button"
                  onClick={() =>
                    hasSubLinks
                      ? setOpenDropdown(isOpen ? null : link.name)
                      : handleNavigate(link.href)
                  }
                  className={`flex w-full items-center justify-between rounded-xl p-3 transition-all ${
                    isActive
                      ? "bg-orange-600/10 text-orange-500"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {link.icon}
                    <span className={`${isMobileExpanded ? "block" : "hidden"} text-sm font-semibold tracking-wide lg:block`}>
                      {link.name}
                    </span>
                  </span>
                  {hasSubLinks ? (
                    <ChevronDown
                      size={16}
                      className={`${isMobileExpanded ? "block" : "hidden"} transition-transform lg:block ${
                        isOpen ? "rotate-180 text-orange-500" : ""
                      }`}
                    />
                  ) : null}
                </button>

                {hasSubLinks && isOpen ? (
                  <div className={`${isMobileExpanded ? "block" : "hidden"} ml-9 mt-1 space-y-1 border-l border-slate-800 lg:block`}>
                    {link.subLinks.map((sub) => (
                      <button
                        type="button"
                        key={sub.name}
                        onClick={() => handleSubLinkClick(sub)}
                        className={`flex w-full items-center gap-3 rounded-r-lg py-2 pl-4 text-xs font-medium transition ${
                          sub.href && isPathActive(sub.href)
                            ? "text-orange-400"
                            : "text-slate-500 hover:text-slate-200"
                        }`}
                      >
                        {sub.icon}
                        {sub.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <SidebarUserMenu
          displayName="Internal Reviewer"
          isExpanded={isMobileExpanded}
          onNavigate={() => setIsMobileExpanded(false)}
        />
      </aside>
    </>
  );
};

export default InternalReviewerSidebar;
