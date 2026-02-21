import React, { useEffect, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Lock, Palette, Save } from "lucide-react";
import { toast } from "react-toastify";
import { auth } from "../../Auth/firebase";
import InspectorNavbar from "./InspectorNavbar";
import InspectorSidebar from "./InspectorSidebar";

const THEME_KEY = "inspectpro_ui_theme";
const ACCENT_KEY = "inspectpro_ui_accent";

const UserPreferences = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [themeMode, setThemeMode] = useState("system");
  const [accent, setAccent] = useState("orange");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const storedAccent = localStorage.getItem(ACCENT_KEY);
    if (storedTheme) setThemeMode(storedTheme);
    if (storedAccent) setAccent(storedAccent);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeMode);
    localStorage.setItem(ACCENT_KEY, accent);
    document.documentElement.setAttribute("data-theme-mode", themeMode);
    document.documentElement.setAttribute("data-theme-accent", accent);
  }, [themeMode, accent]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user || !user.email) {
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

    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    } catch (error) {
      toast.error(error?.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleThemeSave = () => {
    toast.success("UI theme preferences saved.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <InspectorNavbar />
      <div className="flex flex-1">
        <InspectorSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-6 lg:p-8 bg-slate-950">
          <div className="max-w-4xl mx-auto space-y-6">
            <header className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
              <h1 className="text-2xl font-bold text-white uppercase tracking-tight">User Preferences</h1>
              <p className="text-sm text-slate-400 mt-2">
                Update your account password and set your UI theme preferences.
              </p>
            </header>

            <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={16} className="text-orange-500" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">Change Password</h2>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <Save size={14} />
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </section>

            <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Palette size={16} className="text-orange-500" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">UI Theme</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Mode</label>
                  <select
                    value={themeMode}
                    onChange={(e) => setThemeMode(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="system">System</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Accent</label>
                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="orange">Orange</option>
                    <option value="emerald">Emerald</option>
                    <option value="blue">Blue</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleThemeSave}
                className="mt-4 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Save Theme Preferences
              </button>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserPreferences;
