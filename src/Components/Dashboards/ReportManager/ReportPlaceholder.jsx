import React from "react";
import { useAuth } from "../../Auth/AuthContext";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import InspectorNavbar from "../InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../InspectorsFile/InspectorSidebar";

const ReportPlaceholder = ({ title }) => {
  const { user } = useAuth();
  const role = user?.role || "Admin";

  const Navbar =
    role === "Manager"
      ? ManagerNavbar
      : role === "Inspector" || role === "Lead Inspector"
        ? InspectorNavbar
        : AdminNavbar;

  const Sidebar =
    role === "Manager"
      ? ManagerSidebar
      : role === "Inspector" || role === "Lead Inspector"
        ? InspectorSidebar
        : AdminSidebar;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">
              {title}
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
              Report Manager
            </p>
            <div className="mt-6 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8">
              <p className="text-sm text-slate-300">
                This is a placeholder page for the {title}. Add your form fields,
                data sources, and export logic here.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportPlaceholder;
