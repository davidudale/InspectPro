import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle,
  ChevronLeft,
  RotateCcw,
  ShieldCheck,
  Activity,
} from "lucide-react";
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
import { toast } from "react-toastify";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import { getToastErrorMessage } from "../../../utils/toast";
import InternalReviewerNavbar from "./InternalReviewerNavbar";
import InternalReviewerSidebar from "./InternalReviewerSidebar";
import ReportDownloadView from "../ManagerFile/ReportDownloadView";
import { getExternalFeedbackSummary } from "../../../utils/externalFeedbackSummary";

const getTechniqueType = (project, report, preFill) => {
  const candidates = [
    report?.type,
    report?.general?.inspectionTypeName,
    report?.general?.inspectionType,
    report?.general?.selectedTechnique,
    report?.technique,
    project?.reportTemplate,
    project?.selectedTechnique,
    project?.inspectionTypeName,
    project?.inspectionTypeCode,
    preFill?.reportTemplate,
    preFill?.selectedTechnique,
    preFill?.inspectionTypeName,
    preFill?.inspectionTypeCode,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (candidates.some((value) => value.includes("integrity"))) return "integrity";
  if (
    candidates.some(
      (value) =>
        value.includes("utreport") ||
        value.includes("ut report") ||
        value.includes("manual ut") ||
        value.includes("ultrasonic"),
    )
  ) {
    return "ut";
  }
  if (candidates.some((value) => value.includes("aut"))) return "aut";
  if (candidates.some((value) => value.includes("detailed"))) return "detailed";
  return "visual";
};

const getEditRoute = (techniqueType) => {
  if (techniqueType === "integrity") return "/inspector/integrity-check";
  if (techniqueType === "ut") return "/inspector/utreport";
  if (techniqueType === "aut") return "/inspector/aut-report";
  if (techniqueType === "detailed") return "/inspector/Detailed-report";
  return "/inspector/visual-report";
};

const InternalReviewConfirmation = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [resolvedProjectDocId, setResolvedProjectDocId] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState("");

  const targetProjectId =
    id ||
    location.state?.preFill?.id ||
    location.state?.preFill?.projectId ||
    "";

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        if (!targetProjectId) {
          toast.error("Project reference is missing.");
          return;
        }

        let projectData = null;
        let resolvedDocId = "";
        const directSnap = await getDoc(doc(db, "projects", targetProjectId));

        if (directSnap.exists()) {
          projectData = directSnap.data();
          resolvedDocId = directSnap.id;
        } else {
          const byBusinessId = query(
            collection(db, "projects"),
            where("projectId", "==", targetProjectId),
            limit(1),
          );
          const byBusinessIdSnap = await getDocs(byBusinessId);
          if (!byBusinessIdSnap.empty) {
            const projectDoc = byBusinessIdSnap.docs[0];
            projectData = projectDoc.data();
            resolvedDocId = projectDoc.id;
          }
        }

        if (!projectData) {
          toast.error("Project record not found.");
          return;
        }

        setResolvedProjectDocId(resolvedDocId);
        setProjectDetails({ id: resolvedDocId, ...projectData });
        setReportData(projectData.report || location.state?.preFill?.report || null);
      } catch (error) {
        toast.error(getToastErrorMessage(error, "Unable to load the project."));
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [targetProjectId, location.state]);

  const reviewerName =
    user?.fullName || user?.name || user?.displayName || user?.email || "Internal Reviewer";

  const handleOpenFormView = () => {
    const techniqueType = getTechniqueType(projectDetails, reportData, location.state?.preFill);
    const preFill = {
      ...(projectDetails || {}),
      ...(location.state?.preFill || {}),
      id: resolvedProjectDocId || targetProjectId,
      projectId: projectDetails?.projectId || location.state?.preFill?.projectId || targetProjectId,
    };

    navigate(getEditRoute(techniqueType), { state: { preFill } });
  };

  const handleConfirmAndForward = async () => {
    if (!resolvedProjectDocId && !targetProjectId) {
      toast.error("Project reference is missing.");
      return;
    }

    setIsSaving(true);
    try {
      const projectRef = doc(db, "projects", resolvedProjectDocId || targetProjectId);
      const managerName = projectDetails?.managerName || "Manager";

      await updateDoc(projectRef, {
        status: `Passed and Forwarded to ${managerName}`,
        internalReviewStatus: "Approved",
        internalReviewComment: "",
        internalReviewedAt: serverTimestamp(),
        internalReviewedBy: reviewerName,
        internalReviewedById: user?.uid || "",
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Project forwarded to Manager.");
      navigate("/internal-reviewer/projects");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to forward the project."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnReport = async () => {
    const feedback = returnFeedback.trim();
    if (!feedback) {
      toast.error("Please provide feedback for the Lead Inspector.");
      return;
    }

    setIsReturning(true);
    try {
      const projectRef = doc(db, "projects", resolvedProjectDocId || targetProjectId);

      await updateDoc(projectRef, {
        status: "Returned by Internal Reviewer",
        internalReviewStatus: "Returned",
        internalReviewComment: feedback,
        internalReviewedAt: serverTimestamp(),
        internalReviewedBy: reviewerName,
        internalReviewedById: user?.uid || "",
        returnNote: feedback,
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activity_logs"), {
        message: `Internal Reviewer returned report to Lead Inspector: ${feedback}`,
        target: projectDetails?.projectId || targetProjectId,
        userEmail: projectDetails?.supervisorEmail || "",
        userId: projectDetails?.supervisorId || "",
        type: "alert",
        timestamp: serverTimestamp(),
      });

      toast.warning("Report returned to Lead Inspector.");
      setShowReturnModal(false);
      setReturnFeedback("");
      navigate("/internal-reviewer/projects");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to return the report."));
    } finally {
      setIsReturning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Activity className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  const externalFeedbackSummary = getExternalFeedbackSummary(projectDetails);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <InternalReviewerNavbar />
      <div className="flex flex-1">
        <InternalReviewerSidebar />
        <main className="flex-1 bg-slate-950 p-4 sm:p-6 lg:ml-64 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <header className="mb-10 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-orange-500 shadow-inner transition-all hover:bg-orange-600 hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-tighter text-white">
                  <ShieldCheck className="text-emerald-500" /> Confirm Manifest
                </h1>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(true)}
                  disabled={isSaving || isReturning}
                  className="flex items-center gap-2 rounded-xl bg-blue-900 px-8 py-2 text-xs font-bold uppercase text-white shadow-lg transition-all hover:bg-blue-800 disabled:opacity-50"
                >
                  <RotateCcw size={16} /> {isReturning ? "Returning..." : "Return Report"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenFormView}
                  disabled={isSaving || isReturning}
                  className="rounded-xl bg-slate-700 px-8 py-2 text-xs font-bold uppercase text-white shadow-lg transition-all hover:bg-slate-600 disabled:opacity-50"
                >
                  Open Form View
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndForward}
                  disabled={isSaving || isReturning}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-2 text-xs font-bold uppercase text-white shadow-lg transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle size={16} /> {isSaving ? "Syncing..." : "Confirm & Forward"}
                </button>
              </div>
            </header>

            {externalFeedbackSummary ? (
              <section className="mb-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-300">
                  External Review Feedback
                </p>
                <p className="mt-3 text-sm leading-7 text-rose-100">{externalFeedbackSummary}</p>
              </section>
            ) : null}

            <ReportDownloadView
              projectId={resolvedProjectDocId || targetProjectId}
              hideControls
              embedded
            />
          </div>
        </main>
      </div>

      {showReturnModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Return Report Feedback</h3>
            <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">
              Note required corrections for the Lead Inspector.
            </p>
            <textarea
              value={returnFeedback}
              onChange={(event) => setReturnFeedback(event.target.value)}
              placeholder="State clearly what should be corrected before manager approval..."
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
      ) : null}
    </div>
  );
};

export default InternalReviewConfirmation;
