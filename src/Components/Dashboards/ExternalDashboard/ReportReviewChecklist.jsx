import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { ArrowUpRight, ClipboardCheck, FileText, Save } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import ExternalNavbar from "./ExternalNavbar";
import ExternalSideBar from "./ExternalSideBar";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";
import ProjectPreview from "../AdminFiles/ProjectManagement/ProjectPreview";
import { getToastErrorMessage } from "../../../utils/toast";
import { matchesExternalReviewerProject } from "../../../utils/externalReviewerAccess";

const REVIEW_COLLECTION = "project_verification_reviews";
const STATUS_OPTIONS = ["Yet to start", "Ongoing", "Onhold", "Rejected", "Accepted"];
const CHECKLIST_SECTIONS = [
  {
    key: "documentReview",
    title: "Document Review",
    items: [
      "Report format and content",
      "Equipment details and location",
      "Inspection type and criteria",
    ],
  },
  {
    key: "findingsValidation",
    title: "Findings Validation",
    items: [
      "Inspection results and measurements",
      "Photographic evidence",
      "Compliance with standards and regulations",
    ],
  },
  {
    key: "riskAssessment",
    title: "Risk Assessment",
    items: ["Criticality of findings", "Risk mitigation recommendations"],
  },
  {
    key: "complianceCheck",
    title: "Compliance Check",
    items: ["Regulatory requirements", "Company policies and procedures"],
  },
  {
    key: "approvalDecision",
    title: "Approval Decision",
    items: ["Accept report", "Reject report with feedback"],
  },
];

const buildDefaultChecklist = () =>
  CHECKLIST_SECTIONS.reduce((accumulator, section) => {
    accumulator[section.key] = {
      decision: "",
      itemChecks: section.items.reduce((itemAccumulator, item) => {
        itemAccumulator[item] = false;
        return itemAccumulator;
      }, {}),
    };
    return accumulator;
  }, {});

const buildDefaultReviewSummary = () => ({
  status: "Yet to start",
  observation: "",
});

const ReportReviewChecklist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [checklist, setChecklist] = useState(buildDefaultChecklist);
  const [reviewSummary, setReviewSummary] = useState(buildDefaultReviewSummary);
  const [reviewerCreatedAt, setReviewerCreatedAt] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDecision, setActiveDecision] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      setLoadingProjects(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      const nextProjects = snapshot.docs.map((projectDoc) => ({
        id: projectDoc.id,
        ...projectDoc.data(),
      }))
      .filter((project) => matchesExternalReviewerProject(project, user))
      .filter(
        (project) =>
          String(project.status || "").trim().toLowerCase() === "client review in progress",
      );
      setProjects(nextProjects);
      setLoadingProjects(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedProjectId) {
      setChecklist(buildDefaultChecklist());
      setReviewSummary(buildDefaultReviewSummary());
      setReviewerCreatedAt(null);
      return;
    }

    const loadChecklist = async () => {
      setLoadingChecklist(true);
      try {
        const reviewerRef = doc(
          db,
          REVIEW_COLLECTION,
          selectedProjectId,
          "reviewers",
          user.uid,
        );
        const reviewerSnap = await getDoc(reviewerRef);
        const reviewerEntry = reviewerSnap.exists() ? reviewerSnap.data() : null;

        if (reviewerEntry) {
          const savedChecklist = reviewerEntry.sections || {};
          const savedSummary = reviewerEntry.summary || {};
          setChecklist({
            ...buildDefaultChecklist(),
            ...savedChecklist,
          });
          setReviewSummary({
            ...buildDefaultReviewSummary(),
            ...savedSummary,
          });
          setReviewerCreatedAt(reviewerEntry.createdAt || null);
        } else {
          setChecklist(buildDefaultChecklist());
          setReviewSummary(buildDefaultReviewSummary());
          setReviewerCreatedAt(null);
        }
      } catch (error) {
        toast.error(getToastErrorMessage(error, "Unable to load the checklist."));
      } finally {
        setLoadingChecklist(false);
      }
    };

    loadChecklist();
  }, [selectedProjectId, user?.uid]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );
  const visibleSections = CHECKLIST_SECTIONS;

  const handleReviewSummaryChange = (field, value) => {
    setReviewSummary((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleItemCheckChange = (sectionKey, itemLabel, checked) => {
    setChecklist((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        itemChecks: {
          ...(current[sectionKey]?.itemChecks || {}),
          [itemLabel]: checked,
        },
      },
    }));
  };

  const buildDecisionChecklistState = (sectionKey, decisionLabel, sourceChecklist) => {
    const sectionConfig = CHECKLIST_SECTIONS.find((section) => section.key === sectionKey);
    const nextItemChecks = (sectionConfig?.items || []).reduce((accumulator, item) => {
      accumulator[item] = item === decisionLabel;
      return accumulator;
    }, {});

    return {
      ...sourceChecklist,
      [sectionKey]: {
        ...sourceChecklist[sectionKey],
        decision: decisionLabel,
        itemChecks: nextItemChecks,
      },
    };
  };

  const saveChecklistEntries = async (sectionKey = "", checklistState = checklist, summaryState = reviewSummary) => {
    if (!selectedProject || !user?.uid) {
      toast.error("Select a report before saving the checklist.");
      return false;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, REVIEW_COLLECTION, selectedProject.id, "reviewers", user.uid),
        {
          projectDocId: selectedProject.id,
          projectId: selectedProject.projectId || "",
          projectName: selectedProject.projectName || "",
          clientName: selectedProject.clientName || selectedProject.client || "",
          externalReviewerId: user.uid,
          externalReviewerName:
            user.fullName || user.name || user.displayName || user.email || "External Reviewer",
          externalReviewerEmail: user.email || "",
          reviewerType: user.reviewerType || "",
          summary: summaryState,
          sections: sectionKey
            ? { [sectionKey]: checklistState[sectionKey] }
            : checklistState,
          updatedAt: serverTimestamp(),
          createdAt: reviewerCreatedAt || serverTimestamp(),
        },
        { merge: true },
      );

      if (!reviewerCreatedAt) {
        setReviewerCreatedAt(new Date());
      }

      toast.success(
        sectionKey
          ? `${CHECKLIST_SECTIONS.find((section) => section.key === sectionKey)?.title || "Section"} saved successfully.`
          : "Checklist saved successfully.",
      );
      return true;
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to save the checklist."));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChecklist = async () => {
    await saveChecklistEntries();
  };

  const handleDecisionSelect = async (sectionKey, decisionLabel) => {
    const nextChecklist = buildDecisionChecklistState(sectionKey, decisionLabel, checklist);
    setChecklist(nextChecklist);
    const nextSummary =
      decisionLabel === "Reject report with feedback"
        ? { ...reviewSummary, status: "Rejected" }
        : reviewSummary;
    if (nextSummary !== reviewSummary) {
      setReviewSummary(nextSummary);
    }
    setActiveDecision(decisionLabel);
    try {
      const saved = await saveChecklistEntries("", nextChecklist, nextSummary);
      if (saved) {
        navigate("/external-reviewer-projects");
      }
    } finally {
      setActiveDecision("");
    }
  };

  const handleViewReport = async () => {
    if (!selectedProject?.id) {
      toast.error("Select a report before opening it.");
      return;
    }

    try {
      await updateDoc(doc(db, "projects", selectedProject.id), {
        status: "Client Review In Progress",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the project status."));
      return;
    }

    navigate(`/admin/project/${selectedProject.id}`);
  };

  const renderDecisionSummaryCard = () => (
    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/50 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xs font-black text-orange-400">
          S
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-white">Consolidated Review Summary</h3>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Status
          </span>
          <select
            value={reviewSummary.status || "Yet to start"}
            onChange={(event) => handleReviewSummaryChange("status", event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Observation
          </span>
          <textarea
            value={reviewSummary.observation || ""}
            onChange={(event) => handleReviewSummaryChange("observation", event.target.value)}
            rows={4}
            placeholder="Add a consolidated observation for the entire checklist review..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
          />
        </label>
      </div>
    </div>
  );

  return (
    <ControlCenterTableShell
      navbar={<ExternalNavbar />}
      sidebar={<ExternalSideBar />}
      title="Report Review Checklist"
      subtitle="Review every assigned report against the approval checklist and record status updates with observations."
      icon={<ClipboardCheck size={18} />}
      loading={loadingProjects}
      hasData
    >
      <div className="space-y-6 p-2 lg:p-3">
        <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                Checklist Target
              </p>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-white">Select report</span>
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                >
                  <option value="">Select a report</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectName || project.projectId || project.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              onClick={handleViewReport}
              disabled={!selectedProjectId || saving || loadingChecklist}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:border-orange-500/50 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowUpRight size={16} />
              Open Full Report
            </button>
            <button
              onClick={handleSaveChecklist}
              disabled={!selectedProjectId || saving || loadingChecklist}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-500/40 bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Checklist"}
            </button>
          </div>
        </div>

        <div className="flex  justify-center  gap-2 ">
          

          <div className="w-[40%] rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-orange-500">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Report Approval Checklist
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Report Approval Checklist for{" "}
                  <span className="text-orange-400">
                    {selectedProject?.projectName || selectedProject?.projectId || "REPORT NAME"}
                  </span>
                </h2>
              </div>
            </div>

            <div className="max-h-[calc(100vh-250px)] space-y-5 overflow-y-auto pr-1">
              {loadingChecklist ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-400">
                  Loading checklist...
                </div>
              ) : (
                <>
                  {visibleSections.map((section, index) => (
                    <React.Fragment key={section.key}>
                      {section.key === "approvalDecision" ? renderDecisionSummaryCard() : null}
                      <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/50 p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xs font-black text-orange-400">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-bold text-white">{section.title}</h3>
                          </div>
                        </div>

                        <div className="mb-5 space-y-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                          {section.key === "approvalDecision" ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {section.items.map((item) => {
                                const isActive =
                                  checklist[section.key]?.decision === item ||
                                  Boolean(checklist[section.key]?.itemChecks?.[item]);

                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => handleDecisionSelect(section.key, item)}
                                    disabled={saving}
                                    className={`rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${
                                      isActive
                                        ? item.toLowerCase().includes("reject")
                                          ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                        : item.toLowerCase().includes("reject")
                                          ? "border-rose-900/50 bg-rose-950/30 text-rose-200 hover:border-rose-500/50 hover:bg-rose-500/10"
                                          : "border-emerald-900/50 bg-emerald-950/30 text-emerald-200 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                                    }`}
                                  >
                                    {saving && activeDecision === item
                                      ? item.toLowerCase().includes("reject")
                                        ? "Rejecting..."
                                        : "Approving..."
                                      : item}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            section.items.map((item) => (
                              <label
                                key={item}
                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-2 py-2 text-sm text-slate-300 transition hover:border-slate-800 hover:bg-slate-950/40"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(checklist[section.key]?.itemChecks?.[item])}
                                  onChange={(event) =>
                                    handleItemCheckChange(
                                      section.key,
                                      item,
                                      event.target.checked,
                                    )
                                  }
                                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 text-orange-500 focus:ring-orange-500"
                                />
                                <span>{item}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="w-[60%] rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="mb-4 flex items-center gap-3 px-2 pt-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-orange-500">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Report View
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {selectedProject?.projectName || selectedProject?.projectId || "Select a report"}
                </h2>
              </div>
            </div>

            <div className="max-h-[calc(100vh-250px)] overflow-y-auto rounded-[1.5rem] border border-slate-800 bg-slate-950/60">
              {selectedProject ? (
                <ProjectPreview projectId={selectedProject.id} hideControls />
              ) : (
                <div className="flex min-h-[420px] items-center justify-center p-6 text-center text-sm text-slate-400">
                  Select a report to preview it here while you complete the checklist.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ControlCenterTableShell>
  );
};

export default ReportReviewChecklist;
