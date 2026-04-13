import { useState } from "react";
import {
  Activity,
  Building2,
  ChevronDown,
  FileClock,
  LayoutDashboard,
  Menu,
  Settings2,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";

const sidebarLinks = [
  { name: "Overview", icon: <LayoutDashboard size={20} />, href: "/super-admin" },
  { name: "Access Control", icon: <Users size={20} />, href: "/super-admin/access" },
  { name: "Platform Control", icon: <Settings2 size={20} />, href: "/super-admin/system" },
  { name: "Audit Console", icon: <FileClock size={20} />, href: "/super-admin/audit" },
  {
    name: "Operations",
    icon: <Shield size={20} />,
    subLinks: [
      { name: "Admin users", icon: <Users size={16} />, href: "/admin/users" },
      { name: "Projects", icon: <Activity size={16} />, href: "/admin/projects" },
      { name: "Profile & Security", icon: <Shield size={16} />, href: "/profile/security" },
    ],
  },
  {
    name: "System Setup",
    icon: <Settings2 size={20} />,
    subLinks: [
      { name: "Company Profile", icon: <Building2 size={16} />, href: "/admin/company-profile" },
    ],
  },
];

const SuperAdminSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState("Operations");
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const displayName =
    user?.fullName || user?.name || user?.displayName || user?.email || "Super Admin";

  const isPathActive = (href) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    await logout();
    setIsMobileExpanded(false);
    navigate("/login");
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
        className={`fixed z-40 flex h-screen max-w-[85vw] flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
          isMobileExpanded ? "w-64 shadow-2xl shadow-black/40" : "w-16"
        } lg:w-64`}
      >
        <div className="border-b border-slate-800/50 p-4 lg:p-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileExpanded((current) => !current)}
                className="relative mb-4 ml-auto rounded-lg border border-slate-800 p-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white lg:hidden"
                aria-label="Toggle sidebar"
              >
                {isMobileExpanded ? <X size={16} /> : <Menu size={16} />}
              </button>
              <div className="h-8 w-8 rounded-full bg-[linear-gradient(135deg,#f97316,#fb7185)] p-0.5 shadow-orange-500/20 lg:h-12 lg:w-12">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white lg:text-base">
                  SA
                </div>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500" />
            </div>
            <div className={`${isMobileExpanded ? "block" : "hidden"} overflow-hidden lg:block`}>
              <p className="truncate text-sm font-bold uppercase tracking-tight text-white">
                {displayName}
              </p>
              <p className="truncate text-[11px] uppercase tracking-[0.18em] text-orange-400">
                Super admin
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto bg-slate-950 px-3 py-4">
          {sidebarLinks.map((link) => {
            const hasSubLinks = Boolean(link.subLinks);
            const isOpen = openDropdown === link.name;
            const isActive = hasSubLinks
              ? link.subLinks.some((sub) => isPathActive(sub.href))
              : isPathActive(link.href);

            return (
              <div key={link.name} className="w-full">
                <div
                  onClick={() =>
                    hasSubLinks
                      ? setOpenDropdown(isOpen ? null : link.name)
                      : (navigate(link.href), setIsMobileExpanded(false))
                  }
                  className={`group flex cursor-pointer items-center justify-between rounded-xl p-3 transition-all ${
                    isActive
                      ? "bg-orange-600/10 text-orange-500"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${isActive ? "text-orange-500" : "group-hover:text-orange-500"} transition-colors`}>
                      {link.icon}
                    </div>
                    <span className={`${isMobileExpanded ? "block" : "hidden"} text-sm font-semibold tracking-wide lg:block`}>
                      {link.name}
                    </span>
                  </div>
                  {hasSubLinks && (
                    <ChevronDown
                      size={16}
                      className={`${isMobileExpanded ? "block" : "hidden"} transition-transform duration-300 lg:block ${isOpen ? "rotate-180 text-orange-500" : ""}`}
                    />
                  )}
                </div>

                {hasSubLinks && isOpen && (
                  <div className={`${isMobileExpanded ? "block" : "hidden"} ml-9 mt-1 space-y-1 border-l border-slate-800 lg:block`}>
                    {link.subLinks.map((sub) => (
                      <button
                        key={sub.name}
                        type="button"
                        onClick={() => {
                          navigate(sub.href);
                          setIsMobileExpanded(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-r-lg py-2 pl-4 text-xs font-medium transition-all ${
                          isPathActive(sub.href)
                            ? "border-l-2 border-orange-500 bg-orange-500/5 text-orange-500"
                            : "text-slate-500 hover:bg-slate-800/30 hover:text-slate-200"
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

        <div className="border-t border-slate-800/70 bg-slate-950/70 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
