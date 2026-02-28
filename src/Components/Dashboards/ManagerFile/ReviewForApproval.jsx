import React, { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ChevronLeft, ShieldCheck, Check } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../Auth/AuthContext";
import ManagerNavbar from "./ManagerNavbar";
import ManagerSidebar from "./ManagerSidebar";
import ReportDownloadView from "./ReportDownloadView";

const ReviewForApproval = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [isSaving, setIsSaving] = useState(false);

  const targetProjectId =
    id || location.state?.preFill?.id || location.state?.preFill?.projectId;

  const getTechniqueType = () => {
    const raw = (
      location.state?.preFill?.reportTemplate ||
      location.state?.preFill?.selectedTechnique ||
      ""
    ).toLowerCase();

    if (raw.includes("pressure vessel") || raw.includes("integrity")) return "integrity";
    if (raw.includes("detailed")) return "detailed";
    if (raw.includes("aut") || raw.includes("corrosion mapping")) return "aut";
    if (raw.includes("mut") || raw.includes("manual ut")) return "mut";
    if (raw.includes("visual") || raw.includes("vt") || raw.includes("visual testing")) return "visual";
    if (raw.includes("radiography") || raw.includes("rt") || raw.includes("x-ray")) return "visual";
    return "visual";
  };

  const resolveEditRoute = () => {
    const techniqueType = getTechniqueType();
    const base = "/admin/reports";

    if (techniqueType === "integrity") return `${base}/integrity`;
    if (techniqueType === "detailed") return `${base}/detailed`;
    if (techniqueType === "aut") return "/inspector/aut-report";
    if (techniqueType === "mut") return `${base}/mut`;
    return `${base}/visual`;
  };

  const handleModifyReport = () => {
    const editRoute = resolveEditRoute();
    const preFill = {
      ...(location.state?.preFill || {}),
      id: targetProjectId,
      projectId: location.state?.preFill?.projectId || targetProjectId,
    };

    navigate(editRoute, { state: { preFill } });
  };

  const handleConfirmProject = async () => {
    const projectId = targetProjectId;

    if (!projectId) {
      return toast.error("Technical Error: Project Reference Missing");
    }

    setIsSaving(true);
    try {
      const projectRef = doc(db, "projects", projectId);

      await updateDoc(projectRef, {
        status: "Approved",
        confirmedBy: user?.name || user?.email || "Manager",
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Project Approved successfully");
      navigate("/Pending_approval");
    } catch (error) {
      console.error("Confirm Error:", error);
      toast.error(`Authorization Failure: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <ManagerNavbar />
      <div className="flex flex-1">
        <ManagerSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-10 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-orange-500 hover:bg-orange-600 transition-all shadow-inner"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2 text-white">
                  <ShieldCheck className="text-emerald-500" /> Confirm Manifest
                </h1>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleModifyReport}
                  disabled={isSaving}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-2 rounded-xl text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  Modify
                </button>
                <button
                  onClick={handleConfirmProject}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-xl text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Check size={16} /> {isSaving ? "Syncing..." : "OK"}
                </button>
              </div>
            </header>

            {targetProjectId ? (
              <ReportDownloadView projectId={targetProjectId} hideControls embedded />
            ) : (
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 text-center text-xs uppercase tracking-widest text-slate-400">
                Manifest ID missing.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReviewForApproval;

