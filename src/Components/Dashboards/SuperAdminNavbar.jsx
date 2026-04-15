import { useState } from "react";
import { Menu, ShieldEllipsis, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";

const SuperAdminNavbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const displayName =
    user?.fullName || user?.name || user?.displayName || user?.email?.split("@")[0] || "Super Admin";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f97316,#fb7185)] text-white shadow-lg shadow-orange-950/30">
              <ShieldEllipsis size={18} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-400">
                Super Admin
              </p>
              <p className="text-sm font-semibold text-white">InspectProEdge Control</p>
            </div>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <div className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-300">
              Platform owner
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {displayName}
              </p>
              <p className="text-xs text-slate-300">{user?.email || "No email"}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-200 transition hover:bg-rose-500/20"
            >
              Logout
            </button>
          </div>

          <button
            type="button"
            className="p-2 text-white md:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label="Toggle super admin menu"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 md:hidden">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="rounded-xl bg-orange-500/10 p-2 text-orange-300">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{user?.email || "No email"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-rose-200"
            >
              Logout
            </button>
          </div>
        )}
      </nav>
      <div className="h-[73px] w-full shrink-0" />
    </>
  );
};

export default SuperAdminNavbar;
