import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../Auth/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ChevronLeft, ShieldCheck, Check } from "lucide-react";
import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../utils/toast";
import { useAuth } from "../../Auth/AuthContext";
import ManagerNavbar from "./ManagerNavbar";
import ManagerSidebar from "./ManagerSidebar";
import ReportDownloadView from "./ReportDownloadView";
import ProjectPreview from "../AdminFiles/ProjectManagement/ProjectPreview";
import { buildScheduleFromProject } from "../../../utils/inspectionScheduling";
import { getExternalFeedbackSummary } from "../../../utils/externalFeedbackSummary";
import { resetVerificationReviewState } from "../../../utils/externalReviewCycle";

const ReviewForApproval = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [isSaving, setIsSaving] = useState(false);
  const [projectDetails, setProjectDetails] = useState(location.state?.preFill || null);
  // Return modal state (manager -> supervisor feedback loop).
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState("");

  // Accept route id and state prefill id to support both direct route and in-app navigation.
  const targetProjectId =
    id || location.state?.preFill?.id || location.state?.preFill?.projectId;
  // Determine whether this record is still in manager-editable phase.
  const currentStatus = String(
    location.state?.preFill?.status || location.state?.preFill?.report?.status || "",
  );
  const isEditableView = currentStatus
    .toLowerCase()
    .startsWith("passed and forwarded");

  useEffect(() => {
    const fetchProject = async () => {
      if (!targetProjectId) {
        return;
      }

      const projectSnap = await getDoc(doc(db, "projects", targetProjectId));
      if (projectSnap.exists()) {
        setProjectDetails({
          id: projectSnap.id,
          ...projectSnap.data(),
        });
      }
    };

    fetchProject().catch(() => {});
  }, [targetProjectId]);

  const getTechniqueType = () => {
    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    const candidates = [
      location.state?.preFill?.report?.type,
      location.state?.preFill?.report?.general?.inspectionTypeName,
      location.state?.preFill?.report?.general?.inspectionType,
      location.state?.preFill?.report?.general?.selectedTechnique,
      location.state?.preFill?.report?.technique,
      location.state?.preFill?.inspectionTypeName,
      location.state?.preFill?.inspectionType,
      location.state?.preFill?.reportTemplate,
      location.state?.preFill?.selectedTechnique,
    ]
      .map(normalize)
      .filter(Boolean);

    const techniqueMap = {
      integrity: [
        "pressure vessel",
        "integrity",
        "integrity check",
        "integrity check report",
      ],
      detailed: ["detailed", "detailed report", "detailed inspection report"],
      ut: [
        "ut",
        "utreport",
        "ut report",
        "manual ut",
        "ultrasonic test",
        "ultrasonic test report",
      ],
      aut: ["aut", "corrosion mapping"],
      mut: ["mut", "manual ut report"],
      visual: [
        "visual",
        "vt",
        "visual testing",
        "visual testing (vt)",
        "radiography",
        "rt",
        "x-ray",
      ],
    };

    const matchedEntry = candidates
      .map((candidate) => [
        candidate,
        Object.entries(techniqueMap).find(([, labels]) => labels.includes(candidate))?.[0],
      ])
      .find(([, technique]) => technique);

    return matchedEntry?.[1] || "visual";
  };

  const resolveEditRoute = () => {
    // Map technique to editor route.
    const techniqueType = getTechniqueType();
    const base = "/admin/reports";

    if (techniqueType === "integrity") return `${base}/integrity`;
    if (techniqueType === "detailed") return `${base}/detailed`;
    if (techniqueType === "ut") return `${base}/utreport`;
    if (techniqueType === "aut") return "/inspector/aut-report";
    if (techniqueType === "mut") return `${base}/mut`;
    return `${base}/visual`;
  };

  const handleModifyReport = () => {
    // Preserve current prefill payload when switching into report editor.
    const editRoute = resolveEditRoute();
    const techniqueCandidates = [
      location.state?.preFill?.report?.type,
      location.state?.preFill?.report?.general?.inspectionTypeName,
      location.state?.preFill?.report?.general?.inspectionType,
      location.state?.preFill?.report?.general?.selectedTechnique,
      location.state?.preFill?.report?.technique,
      location.state?.preFill?.inspectionTypeName,
      location.state?.preFill?.inspectionType,
      location.state?.preFill?.reportTemplate,
      location.state?.preFill?.selectedTechnique,
    ].filter(Boolean);
    const preserveForwardedStatusOnSave = currentStatus
      .toLowerCase()
      .startsWith("passed and forwarded");
    const preFill = {
      ...(location.state?.preFill || {}),
      id: targetProjectId,
      projectId: location.state?.preFill?.projectId || targetProjectId,
      status: currentStatus,
      preserveForwardedStatusOnSave,
    };

    console.log("ReviewForApproval Open Form View", {
      techniqueType: getTechniqueType(),
      editRoute,
      techniqueCandidates,
      reportType: location.state?.preFill?.report?.type || "",
    });

    navigate(editRoute, { state: { preFill } });
  };

  const handleConfirmProject = async () => {
    // Final manager approval transitions the workflow to Approved.
    const projectId = targetProjectId;

    if (!isEditableView) {
      return toast.error(
        "Confirmation is only available after the project has been passed and forwarded.",
      );
    }

    if (!projectId) {
      return toast.error("Project reference is missing.");
    }

    setIsSaving(true);
    try {
      const projectRef = doc(db, "projects", projectId);
      const approvedAt = new Date();
      const preFillProject = {
        ...(location.state?.preFill || {}),
        id: projectId,
      };
      let inspectionTypeData = null;

      if (preFillProject.inspectionTypeId) {
        const inspectionTypeSnap = await getDoc(
          doc(db, "inspection_types", preFillProject.inspectionTypeId),
        );
        if (inspectionTypeSnap.exists()) {
          inspectionTypeData = {
            id: inspectionTypeSnap.id,
            ...inspectionTypeSnap.data(),
          };
        }
      }

      await updateDoc(projectRef, {
        status: "Approved",
        confirmedBy: user?.name || user?.email || "Manager",
        inspectionEndDate: serverTimestamp(),
        approvedAt: serverTimestamp(),
        confirmedAt: serverTimestamp(),
        clientReviewDecisionAt: null,
        clientReviewDecisionBy: null,
        clientReviewDecisionById: null,
        reportAcceptedAt: null,
        reportAcceptedBy: null,
        reportRejectedAt: null,
        reportRejectedBy: null,
        updatedAt: serverTimestamp(),
        returnNote: "",
      });

      await resetVerificationReviewState({
        db,
        projectDocId: projectId,
        projectId: preFillProject.projectId || "",
      });
      setProjectDetails((current) => ({
        ...(current || {}),
        status: "Approved",
        externalFeedbackLatestMessage: null,
        externalFeedbackLatestDecisionAt: null,
        externalFeedbackLatestBy: null,
        externalFeedbackLatestByEmail: null,
        externalFeedbackLatestId: null,
        externalFeedbackLatestStatus: null,
      }));

      const { scheduleDoc, equipmentSnapshot } = buildScheduleFromProject({
        project: preFillProject,
        inspectionType: inspectionTypeData,
        approvedAt,
        approvedBy: user?.name || user?.email || "Manager",
      });

      if (scheduleDoc.equipmentId) {
        await addDoc(collection(db, "inspection_schedules"), {
          ...scheduleDoc,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "equipment", scheduleDoc.equipmentId), {
          lastInspection: equipmentSnapshot.lastInspection,
          nextInspection: equipmentSnapshot.nextInspection,
          updatedAt: serverTimestamp(),
        });
      }

      toast.success("Project approved successfully.");
      navigate("/Pending_approval");
    } catch (error) {
      console.error("Confirm Error:", error);
      toast.error(getToastErrorMessage(error, "Unable to approve the project."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnToSupervisor = async () => {
    // Open feedback modal first; submit handler performs the DB update.
    setShowReturnModal(true);
  };

  const handleSubmitReturnToSupervisor = async () => {
    // Return action pushes workflow back to supervisor queue with explicit feedback note.
    const projectId = targetProjectId;
    if (!projectId) {
      return toast.error("Project reference is missing.");
    }
    const feedback = returnFeedback.trim();
    if (!feedback) {
      return toast.error("Please provide return feedback.");
    }

    setIsSaving(true);
    try {
      // Keep the dynamic assignee naming pattern used across status strings.
      const assignedSupervisorName =
        location.state?.preFill?.supervisorName || "Lead Inspector";
      const projectRef = doc(db, "projects", projectId);

      await updateDoc(projectRef, {
        status: `Pending Confirmation- Report With ${assignedSupervisorName}`,
        returnNote: feedback,
        returnedBy: user?.name || user?.email || "Manager",
        returnedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.warning("Report returned to the external reviewer.");
      setShowReturnModal(false);
      setReturnFeedback("");
      navigate("/Pending_approval");
    } catch (error) {
      console.error("Return Error:", error);
      toast.error(getToastErrorMessage(error, "Unable to return the report."));
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
            {getExternalFeedbackSummary(projectDetails) ? (
              <section className="mb-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-300">
                  External Rejection Feedback
                </p>
                <p className="mt-3 text-sm leading-7 text-rose-100">
                  {getExternalFeedbackSummary(projectDetails)}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-rose-200/80">
                  Latest note from {projectDetails?.externalFeedbackLatestBy || "External Reviewer"}
                </p>
              </section>
            ) : null}
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
                {/* Return action is only valid while item is in "Passed and Forwarded..." stage. */}
                {isEditableView && (
                  <button
                    onClick={handleReturnToSupervisor}
                    disabled={isSaving}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-2 rounded-xl text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    Return
                  </button>
                )}
                <button
                  onClick={handleModifyReport}
                  disabled={isSaving || !isEditableView}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-2 rounded-xl text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  Open Form View
                </button>
                <button
                  onClick={handleConfirmProject}
                  disabled={isSaving || !isEditableView}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-xl text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Check size={16} /> {isSaving ? "Syncing..." : "Confirm"}
                </button>
              </div>
            </header>

            {targetProjectId ? (
              // Editable renderer for active manager-review stage; read-only webview for other states.
              isEditableView ? (
                <ReportDownloadView
                  projectId={targetProjectId}
                  hideControls
                  embedded
                  hideSaveReportButton={isEditableView}
                />
              ) : (
                <ProjectPreview projectId={targetProjectId} hideControls />
              )
            ) : (
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 text-center text-xs uppercase tracking-widest text-slate-400">
                Manifest ID missing.
              </div>
            )}
          </div>
        </main>
      </div>
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Return Report</h3>
            <p className="mt-1 text-xs text-slate-400 uppercase tracking-wider">
              Write feedback for the supervisor before returning.
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
                disabled={isSaving}
                className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold uppercase text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReturnToSupervisor}
                disabled={isSaving}
                className="rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {isSaving ? "Returning..." : "Submit Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewForApproval;
