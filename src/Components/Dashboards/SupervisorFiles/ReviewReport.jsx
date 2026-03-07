import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";
import InspectorNavbar from "../InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../InspectorsFile/InspectorSidebar";
import ProjectPreview from "../AdminFiles/ProjectManagement/ProjectPreview";

const ReviewReport = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const resolvedProjectId =
    id || location.state?.preFill?.id || location.state?.preFill?.projectId || "";

  const isSupervisorRole =
    user?.role === "Lead Inspector" || user?.role === "Supervisor";
  const Navbar =
    user?.role === "Admin"
      ? AdminNavbar
      : user?.role === "Manager"
        ? ManagerNavbar
        : isSupervisorRole
          ? SupervisorNavbar
          : InspectorNavbar;
  const Sidebar =
    user?.role === "Admin"
      ? AdminSidebar
      : user?.role === "Manager"
        ? ManagerSidebar
        : isSupervisorRole
          ? SupervisorSidebar
          : InspectorSidebar;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            {resolvedProjectId ? (
              <ProjectPreview
                projectId={resolvedProjectId}
                hideControls
                onClose={() => navigate(-1)}
              />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
                Project reference missing. Go back and open the report again.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReviewReport;
