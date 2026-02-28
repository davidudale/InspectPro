import React, { useState } from "react";
import { Menu, X, FileText, LogOut, User } from "lucide-react"; // Example icons

const sidebarLinks = [
  { icon: <FileText size={20} />, label: "Inspections" },
  { icon: <User size={20} />, label: "Profile" },
  { icon: <LogOut size={20} />, label: "Settings" },
];

const DashboardSidebar = () => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const toggleMobileMenu = () => {
    setIsMobileExpanded((prev) => !prev);
  };

  return (
    <aside
      className={`border-r border-slate-800 bg-slate-900/20 transition-all duration-300 flex flex-col ${
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
              Alex InspectPro
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

      {sidebarLinks.map((link, index) => (
        <div
          key={index}
          className="flex flex-col items-center lg:items-start p-4"
        >
          <div className="lg:flex items-center gap-3 text-slate-400 hover:text-orange-500 cursor-pointer transition-colors">
            {link.icon}
            <span className={`${isMobileExpanded ? "block" : "hidden"} lg:block text-sm font-medium`}>
              {link.label}
            </span>
          </div>
        </div>
      ))}
    </aside>
  );
};

export default DashboardSidebar;
