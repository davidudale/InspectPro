import React, { useState } from "react";
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Users, 
  ShieldAlert, 
  Settings, 
  ChevronDown, 
  Briefcase, 
  Wrench, 
  Sliders 
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const sidebarLinks = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    href: "/admin-dashboard",
  },
  {
    name: "Operations",
    icon: <ClipboardCheck size={20} />,
    // This item has a dropdown
    subLinks: [
      { name: "Inspections", icon: <FileText size={16} />, href: "/admin/inspections" },
      { name: "Report Management", icon: <ShieldAlert size={16} />, href: "/admin/logs" },
    ]
  },
  { name: "User Management", icon: <Users size={20} />, href: "/admin/users" },
  {
    name: "System Setup",
    icon: <Settings size={20} />,
    subLinks: [
      { name: "Project Setup", icon: <Briefcase size={16} />, href: "/admin/projects" },
      { name: "Equipment Management", icon: <Wrench size={16} />, href: "/admin/equipment" },
      { name: "System Config", icon: <Sliders size={16} />, href: "/admin/config" },
    ]
  },
];

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // State to track which dropdown is open (by name)
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 lg:w-64 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl transition-all duration-300 flex flex-col z-50">
      {/* Profile Section */}
      <div className="p-4 lg:p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 p-0.5">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white font-bold text-xs lg:text-sm">
                AV
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-white uppercase tracking-tight truncate">Alex InspectPro</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">System Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sidebarLinks.map((link, index) => {
          const hasSubLinks = !!link.subLinks;
          const isOpen = openDropdown === link.name;
          const isActive = location.pathname === link.href;

          return (
            <div key={index} className="w-full">
              {/* Main Link or Dropdown Trigger */}
              <div
                onClick={() => hasSubLinks ? toggleDropdown(link.name) : navigate(link.href)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group
                  ${isActive ? "bg-orange-600/10 text-orange-500" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${isActive ? "text-orange-500" : "group-hover:text-orange-500"} transition-colors`}>
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
                        ${location.pathname === sub.href 
                          ? "text-orange-500 bg-orange-500/5 border-l-2 border-orange-500" 
                          : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/30"}`}
                    >
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