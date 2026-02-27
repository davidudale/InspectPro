import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../Auth/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { ChevronLeft, Activity, ShieldCheck, CheckCircle, RotateCcw } from "lucide-react";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../Auth/AuthContext";
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";
import ReportDownloadView from "../ManagerFile/ReportDownloadView";

const ReviewForConfirmation = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState("");

  const targetProjectId =
    id ||
    location.state?.preFill?.id ||
    location.state?.preFill?.projectId ||
    reportData?.general?.projectId ||
    "";

  useEffect(() => {
    const fetchFullReport = async () => {
      setLoading(true);
      try {
        if (!targetProjectId) {
          toast.error("Manifest ID missing.");
          return;
        }

        const q = query(
          collection(db, "inspection_reports"),
          where("general.projectId", "==", targetProjectId),
          limit(1),
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setReportData(querySnapshot.docs[0].data());
        } else {
          toast.warn("No inspection data found.");
          if (location.state?.preFill) setReportData(location.state.preFill);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Database handshake failed.");
      } finally {
        setLoading(false);
      }
    };

    fetchFullReport();
  }, [targetProjectId, location.state]);

  const handleConfirmProject = async () => {
    if (!targetProjectId) {
      return toast.error("Technical Error: Project Reference Missing");
    }

    setIsSaving(true);
    try {
      const projectRef = doc(db, "projects", targetProjectId);

      await updateDoc(projectRef, {
        status: "Confirmed and Forwarded",
        confirmedBy: user?.displayName || user?.email || "Lead Inspector",
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Project Confirmed and Forwarded successfully");
      navigate("/ConfirmedInspection");
    } catch (error) {
      console.error("Confirm Error:", error);
      toast.error(`Authorization Failure: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnReport = async () => {
    const feedback = returnFeedback.trim();

    if (!targetProjectId) {
      return toast.error("Technical Error: Project Reference Missing");
    }
    if (!feedback) {
      return toast.error("Please provide feedback for the inspector.");
    }

    setIsReturning(true);
    try {
      const projectRef = doc(db, "projects", targetProjectId);
      const projectSnap = await getDoc(projectRef);
      const projectData = projectSnap.exists() ? projectSnap.data() : {};
      const inspectorUserId =
        projectData?.inspectorId ||
        reportData?.general?.inspectorId ||
        location.state?.preFill?.inspectorId ||
        "";
      let inspectorEmail = projectData?.inspectorEmail || "";

      if (!inspectorEmail && inspectorUserId) {
        const inspectorRef = doc(db, "users", inspectorUserId);
        const inspectorSnap = await getDoc(inspectorRef);
        inspectorEmail = inspectorSnap.exists() ? inspectorSnap.data()?.email || "" : "";
      }

      if (!inspectorEmail && !inspectorUserId) {
        throw new Error("Inspector reference not found. Cannot deliver feedback log.");
      }

      await updateDoc(projectRef, {
        status: "Returned for correction",
        returnNote: feedback,
        returnedBy: user?.displayName || user?.email || "Lead Inspector",
        returnedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activity_logs"), {
        message: `Lead Inspector returned report for corrections: ${feedback}`,
        target: projectData?.projectId || targetProjectId,
        userEmail: inspectorEmail || "",
        userId: inspectorUserId || "",
        type: "alert",
        timestamp: serverTimestamp(),
      });

      toast.warning("Report returned to inspector");
      setShowReturnModal(false);
      setReturnFeedback("");
      navigate("/ConfirmedInspection");
    } catch (error) {
      console.error("Return Error:", error);
      toast.error(`Return failed: ${error.message}`);
    } finally {
      setIsReturning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Activity className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (!reportData) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {user?.role === "Admin" ? <AdminNavbar /> : <SupervisorNavbar />}
      <div className="flex flex-1">
        {user?.role === "Admin" ? <AdminSidebar /> : <SupervisorSidebar />}
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
                  onClick={() => setShowReturnModal(true)}
                  disabled={isSaving || isReturning}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-2 rounded-xl text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw size={16} /> {isReturning ? "Returning..." : "Return Report"}
                </button>
                <button
                  onClick={handleConfirmProject}
                  disabled={isSaving || isReturning}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-xl text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={16} /> {isSaving ? "Syncing..." : "Confirm & Forward"}
                </button>
              </div>
            </header>

            <ReportDownloadView
              projectId={targetProjectId}
              hideControls
              embedded
            />
          </div>
        </main>
      </div>

      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Return Report Feedback</h3>
            <p className="mt-1 text-xs text-slate-400 uppercase tracking-wider">
              Note required corrections for the inspector.
            </p>
            <textarea
              value={returnFeedback}
              onChange={(e) => setReturnFeedback(e.target.value)}
              placeholder="State clearly what should be corrected before resubmission..."
              className="mt-4 h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 outline-none focus:border-amber-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnFeedback("");
                }}
                disabled={isReturning}
                className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold uppercase text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturnReport}
                disabled={isReturning}
                className="rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {isReturning ? "Returning..." : "Submit Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewForConfirmation;

