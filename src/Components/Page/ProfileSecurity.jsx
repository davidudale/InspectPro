import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { KeyRound, Lock, Save, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { auth, db } from "../Auth/firebase";
import { useAuth } from "../Auth/AuthContext";
import { getToastErrorMessage } from "../../utils/toast";
import AdminNavbar from "../Dashboards/AdminNavbar";
import AdminSidebar from "../Dashboards/AdminSidebar";
import ManagerNavbar from "../Dashboards/ManagerFile/ManagerNavbar";
import ManagerSidebar from "../Dashboards/ManagerFile/ManagerSidebar";
import SupervisorNavbar from "../Dashboards/SupervisorFiles/SupervisorNavbar";
import SupervisorSidebar from "../Dashboards/SupervisorFiles/SupervisorSidebar";
import InspectorNavbar from "../Dashboards/InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../Dashboards/InspectorsFile/InspectorSidebar";
import ExternalNavbar from "../Dashboards/ExternalDashboard/ExternalNavbar";
import ExternalSideBar from "../Dashboards/ExternalDashboard/ExternalSideBar";

const resolveDashboardPath = (role) => {
  if (role === "Admin") return "/admin-dashboard";
  if (role === "Manager") return "/ManagerDashboard";
  if (role === "Lead Inspector") return "/SupervisorDashboard";
  if (role === "External_Reviewer" || role === "External Reviewer") {
    return "/external-reviewer-dashboard";
  }
  return "/inspectionDashboard";
};

const resolveShell = (role) => {
  if (role === "Admin") {
    return { navbar: <AdminNavbar />, sidebar: <AdminSidebar /> };
  }
  if (role === "Manager") {
    return { navbar: <ManagerNavbar />, sidebar: <ManagerSidebar /> };
  }
  if (role === "Lead Inspector") {
    return { navbar: <SupervisorNavbar />, sidebar: <SupervisorSidebar /> };
  }
  if (role === "External_Reviewer" || role === "External Reviewer") {
    return { navbar: <ExternalNavbar />, sidebar: <ExternalSideBar /> };
  }
  return { navbar: <InspectorNavbar />, sidebar: <InspectorSidebar /> };
};

const ProfileSecurity = () => {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const isForcedPasswordChange = Boolean(
    user?.mustChangePassword || location.state?.forcedPasswordChange,
  );
  const shell = useMemo(() => resolveShell(user?.role), [user?.role]);

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    const currentUser = auth.currentUser;

    if (!currentUser || !currentUser.email || !user?.uid) {
      toast.error("No authenticated user found.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("Choose a new password that is different from the current password.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      await updateDoc(doc(db, "users", user.uid), {
        mustChangePassword: false,
        passwordChangedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await refreshUserProfile();

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success(
        isForcedPasswordChange
          ? "Password updated. Your account is now fully active."
          : "Password updated successfully.",
      );

      navigate(resolveDashboardPath(user?.role), { replace: true });
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the password."));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      {shell.navbar}
      <div className="flex flex-1">
        {shell.sidebar}
        <main className="flex-1 ml-16 lg:ml-64 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(180deg,_#070c19_0%,_#090f1d_100%)] px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <section className="rounded-[2rem] border border-slate-800 bg-[#0a1122] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.35)]">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-orange-400">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-400">
                    Profile Security
                  </p>
                  <h1 className="mt-2 text-2xl font-black text-white">
                    {isForcedPasswordChange ? "Change Your Default Password" : "Update Your Password"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                    {isForcedPasswordChange
                      ? "Your account was created with a default password. You need to set a personal password before you can continue using the application."
                      : "Keep your account secure by changing your password whenever needed."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800 bg-[#0a1122] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.3)]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Account Name
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {user?.fullName || user?.name || user?.displayName || "Unnamed User"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Signed In As
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{user?.email || "No email"}</p>
                </div>
              </div>

              <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-[0.16em]">
                    <KeyRound size={16} />
                    Password Policy
                  </div>
                  <p className="mt-2 text-xs leading-6 text-amber-50/90">
                    Use at least 6 characters and make sure the new password is different from the default one you were given.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    placeholder="Enter current/default password"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    placeholder="Create a new password"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                    placeholder="Confirm the new password"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Lock size={14} />
                    {isForcedPasswordChange
                      ? "Access to other protected routes stays blocked until this is completed."
                      : "You can return to your dashboard after saving."}
                  </div>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={14} />
                    {isUpdatingPassword ? "Updating..." : "Save New Password"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfileSecurity;
