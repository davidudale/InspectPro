import React, { useEffect, useRef, useState } from "react";
import { ChevronUp, LogOut, Shield, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";

const buildInitials = (value) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "IP";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const SidebarUserMenu = ({ displayName, isExpanded, onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const resolvedName =
    displayName || user?.fullName || user?.name || user?.displayName || user?.email || "User";
  const roleLabel = user?.reviewerType
    ? String(user.reviewerType).replaceAll("_", " ")
    : user?.role || "Team Member";
  const profileDetails = [
    { label: "Role", value: roleLabel },
    { label: "Email", value: user?.email || "No email" },
    {
      label: "Status",
      value: user?.isOnline ? "Online" : user?.presenceState || "Active session",
    },
    {
      label: "Verification",
      value: user?.emailVerified ? "Verified" : "Pending verification",
    },
  ];

  if (user?.uid) {
    profileDetails.push({
      label: "User ID",
      value: `${String(user.uid).slice(0, 8)}...`,
    });
  }

  const handleNavigate = (href) => {
    setIsOpen(false);
    navigate(href);
    onNavigate?.();
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate("/login");
    onNavigate?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative border-t border-slate-800/70 bg-slate-950/70 p-3"
    >
      {isOpen && (
        <div className="absolute bottom-[calc(100%-0.5rem)] left-3 right-3 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="rounded-xl border border-slate-800/70 bg-slate-900/80 px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white">
                {buildInitials(resolvedName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{resolvedName}</p>
                <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-slate-500">
                  {roleLabel}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {profileDetails.map((detail) => (
                    <div
                      key={detail.label}
                      className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-2.5 py-2"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {detail.label}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-300">{detail.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <button
              type="button"
              onClick={() => handleNavigate("/profile/security")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
            >
              <UserCircle2 size={16} />
              <span>Profile</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("/profile/security")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
            >
              <Shield size={16} />
              <span>Security</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3 text-left transition hover:border-slate-700 hover:bg-slate-900"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-xs font-bold text-white">
          {buildInitials(resolvedName)}
        </div>
        <div className={`${isExpanded ? "min-w-0 flex-1 lg:block" : "hidden"} lg:block`}>
          <p className="truncate text-sm font-semibold text-white">{resolvedName}</p>
          <p className="truncate text-xs text-slate-400">{user?.email || roleLabel}</p>
        </div>
        <ChevronUp
          size={16}
          className={`${isExpanded ? "block" : "hidden"} shrink-0 text-slate-500 transition-transform lg:block ${
            isOpen ? "rotate-0" : "rotate-180"
          }`}
        />
      </button>
    </div>
  );
};

export default SidebarUserMenu;
