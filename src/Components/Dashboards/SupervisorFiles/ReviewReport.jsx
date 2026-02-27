import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";
import ReportDownloadView from "../ManagerFile/ReportDownloadView";

const ReviewReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {user?.role === "Admin" ? <AdminNavbar /> : <SupervisorNavbar />}
      <div className="flex flex-1">
        {user?.role === "Admin" ? <AdminSidebar /> : <SupervisorSidebar />}
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            <ReportDownloadView
              projectId={id}
              embedded
              showCloseButton
              onClose={() => navigate(-1)}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReviewReport;

