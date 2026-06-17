import React from "react";
import { LogOut, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MessageBell from "../../Common/MessageBell";
import { useAuth } from "../../Auth/AuthContext";

const InternalReviewerNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const displayName =
    user?.fullName || user?.name || user?.displayName || user?.email || "Internal Reviewer";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center justify-between p-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 rotate-45 items-center justify-center rounded-sm bg-gradient-to-br from-orange-500 to-orange-700">
              <div className="h-3 w-3 -rotate-45 rounded-full bg-white" />
            </div>
            <span className="text-xl font-bold tracking-tighter text-white lg:text-2xl">
              InspectProEdge.<span className="text-orange-500">.</span>
            </span>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <MessageBell user={user} />
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Internal Reviewer
              </span>
              <span className="text-xs font-medium text-white">{displayName}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-sm bg-red-900/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-red-700"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>

          <button
            type="button"
            className="p-2 text-white md:hidden"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {isMenuOpen ? (
          <div className="space-y-4 border-t border-slate-800 bg-slate-900 p-4 md:hidden">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Internal Reviewer
              </p>
              <p className="mt-1 text-sm text-white">{displayName}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-sm bg-red-900 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white"
            >
              Logout
            </button>
          </div>
        ) : null}
      </nav>
      <div className="h-[73px] w-full shrink-0" />
    </>
  );
};

export default InternalReviewerNavbar;
