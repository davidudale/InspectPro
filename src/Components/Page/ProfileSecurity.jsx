import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  BadgeCheck,
  Check,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  Save,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
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

const buildInitials = (value) => {
  const normalized = String(value || "").trim();

  if (!normalized) return "IP";

  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const formatUserDate = (value) => {
  const resolvedDate = value?.toDate?.() || (value instanceof Date ? value : null);

  if (!resolvedDate || Number.isNaN(resolvedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(resolvedDate);
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
  const profileName = user?.fullName || user?.name || user?.displayName || "Unnamed User";
  const roleLabel = user?.reviewerType
    ? String(user.reviewerType).replaceAll("_", " ")
    : user?.role || "No role assigned";
  const profileCards = useMemo(
    () => [
      {
        label: "Account Name",
        value: profileName,
        icon: <UserRound size={16} className="text-orange-400" />,
      },
      {
        label: "Signed In As",
        value: user?.email || "No email",
        icon: <Mail size={16} className="text-orange-400" />,
      },
      {
        label: "Role",
        value: roleLabel,
        icon: <BadgeCheck size={16} className="text-orange-400" />,
      },
      {
        label: "User ID",
        value: user?.uid || "Unavailable",
        icon: <Fingerprint size={16} className="text-orange-400" />,
      },
    ],
    [profileName, roleLabel, user?.email, user?.uid],
  );
  const detailCards = useMemo(
    () => [
      {
        label: "Email Status",
        value: user?.emailVerified ? "Verified" : "Pending verification",
        icon: <ShieldCheck size={16} className="text-orange-400" />,
      },
      {
        label: "Presence",
        value: user?.isOnline ? "Online" : user?.presenceState || "Offline",
        icon: <Lock size={16} className="text-orange-400" />,
      },
      {
        label: "Client Workspace",
        value: user?.clientName || "Not assigned",
        icon: <UserRound size={16} className="text-orange-400" />,
      },
      {
        label: "Last Seen",
        value: formatUserDate(user?.lastSeen),
        icon: <KeyRound size={16} className="text-orange-400" />,
      },
    ],
    [user],
  );

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
                    User Profile
                  </p>
                  <h1 className="mt-2 text-2xl font-black text-white">
                    {isForcedPasswordChange ? "User Profile" : "User Profile"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                    {isForcedPasswordChange
                      ? "Your account was created with a default password. You need to set a personal password before you can continue using the application."
                      : "Keep your account secure by changing your password whenever needed."}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
              <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0a1122] text-slate-200 shadow-[0_24px_70px_rgba(2,6,23,0.3)]">
                <div className="bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.2)_0%,rgba(15,23,42,0.96)_58%,rgba(10,17,34,1)_100%)] px-6 pb-6 pt-8">
                  <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-[2rem] border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.9)_0%,rgba(2,6,23,0.98)_100%)] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                    <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#fb923c_0%,#ea580c_35%,#0f172a_78%)] text-5xl font-black uppercase tracking-[0.2em] text-white">
                      {buildInitials(profileName)}
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-white">My profile</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Role: {roleLabel}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <p>Last seen</p>
                      <p className="mt-1 font-medium text-slate-300">{formatUserDate(user?.lastSeen)}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {profileCards.map((card) => (
                      <div
                        key={card.label}
                        className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            {card.label}
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-100">
                            {card.value}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-xl border border-orange-500/20 bg-orange-500/10 p-2">
                          {card.icon}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        SMS alerts activation
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {user?.emailVerified ? "Notifications ready" : "Verify account to enable alerts"}
                      </p>
                    </div>
                    <span className={`h-3 w-3 rounded-full ${user?.emailVerified ? "bg-emerald-500" : "bg-amber-400"}`} />
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(resolveDashboardPath(user?.role))}
                    className="mt-5 inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#fb7185_100%)] px-8 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(244,114,182,0.28)] transition hover:opacity-95"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-slate-800 bg-[#0a1122] p-6 text-slate-200 shadow-[0_24px_70px_rgba(2,6,23,0.18)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">My account status</p>
                      <p className="mt-1 text-xs text-slate-500">Identity and access controls</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-400 shadow-sm">
                      <Search size={12} />
                      <span>Edit</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4 shadow-sm">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Active account
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-100">
                          {user?.email || "No email"}
                        </p>
                      </div>
                      <span className="rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white">
                        {user?.isOnline ? "Online" : "Active"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4 shadow-sm">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Verification
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-100">
                          {user?.emailVerified ? "Email verified" : "Verification pending"}
                        </p>
                      </div>
                      <span className={`rounded-full px-4 py-2 text-xs font-bold text-white ${user?.emailVerified ? "bg-lime-500" : "bg-amber-500"}`}>
                        {user?.emailVerified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-800 bg-[#0a1122] p-6 text-slate-200 shadow-[0_24px_70px_rgba(2,6,23,0.18)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">Profile details</p>
                      <p className="mt-1 text-xs text-slate-500">Workspace, security, and session signals</p>
                    </div>
                    <div className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-400 shadow-sm">
                      Live data
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {detailCards.map((card) => (
                      <div
                        key={card.label}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
                            {card.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                              {card.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-100">{card.value}</p>
                          </div>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${card.tone === "good" ? "bg-lime-100 text-lime-700" : card.tone === "warn" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {card.badge}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800 bg-[#0a1122] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.3)]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-400">
                  Security Center
                </p>
                <h2 className="mt-2 text-xl font-black text-white">Password Settings</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                  Update your password here while keeping the rest of your account information visible.
                </p>
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
                    {isUpdatingPassword ? <Save size={14} /> : <Check size={14} />}
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
