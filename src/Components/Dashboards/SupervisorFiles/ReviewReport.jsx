import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";
import ProjectPreview from "../AdminFiles/ProjectManagement/ProjectPreview";

const ReviewReport = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const resolvedProjectId =
    id || location.state?.preFill?.id || location.state?.preFill?.projectId || "";

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {user?.role === "Admin" ? <AdminNavbar /> : <SupervisorNavbar />}
      <div className="flex flex-1">
        {user?.role === "Admin" ? <AdminSidebar /> : <SupervisorSidebar />}
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
