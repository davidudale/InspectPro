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

const STATUS_OPTIONS = ["Yet to Start", "Ongoing", "OnHold", "Pending", "Completed"];

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
    items: ["Approve report", "Reject report with feedback"],
  },
];

const REVIEWER_SECTION_ACCESS = {
  verification_officer_1: ["documentReview"],
  verification_officer_2: ["documentReview", "findingsValidation"],
  verification_officer_3: ["documentReview", "findingsValidation", "riskAssessment"],
  verification_officer_4: [
    "documentReview",
    "findingsValidation",
    "riskAssessment",
    "complianceCheck",
  ],
  verification_lead_officer: [
    "documentReview",
    "findingsValidation",
    "riskAssessment",
    "complianceCheck",
    "approvalDecision",
  ],
};

const buildDefaultChecklist = () =>
  CHECKLIST_SECTIONS.reduce((accumulator, section) => {
    accumulator[section.key] = {
      status: "Yet to Start",
      observation: "",
      decision: "",
      itemChecks: section.items.reduce((itemAccumulator, item) => {
        itemAccumulator[item] = false;
        return itemAccumulator;
      }, {}),
    };
    return accumulator;
  }, {});

const ReportReviewChecklist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [checklist, setChecklist] = useState(buildDefaultChecklist);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSectionKey, setSavingSectionKey] = useState("");

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
      .filter((project) => matchesExternalReviewerProject(project, user));
      setProjects(nextProjects);
      setLoadingProjects(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedProjectId) {
      setChecklist(buildDefaultChecklist());
      return;
    }

    const loadChecklist = async () => {
      setLoadingChecklist(true);
      try {
        const checklistRef = doc(db, "report_review_checklists", `${selectedProjectId}_${user?.uid}`);
        const checklistSnap = await getDoc(checklistRef);

        if (checklistSnap.exists()) {
          const savedChecklist = checklistSnap.data()?.sections || {};
          setChecklist({
            ...buildDefaultChecklist(),
            ...savedChecklist,
          });
        } else {
          setChecklist(buildDefaultChecklist());
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
  const visibleSections = useMemo(() => {
    const normalizedReviewerType = String(user?.reviewerType || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const allowedSectionKeys = REVIEWER_SECTION_ACCESS[normalizedReviewerType];

    if (!allowedSectionKeys) {
      return CHECKLIST_SECTIONS;
    }

    return CHECKLIST_SECTIONS.filter((section) => allowedSectionKeys.includes(section.key));
  }, [user?.reviewerType]);

  const handleSectionChange = (sectionKey, field, value) => {
    setChecklist((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        [field]: value,
      },
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

  const handleDecisionChange = (sectionKey, decisionLabel) => {
    const sectionConfig = CHECKLIST_SECTIONS.find((section) => section.key === sectionKey);
    const nextItemChecks = (sectionConfig?.items || []).reduce((accumulator, item) => {
      accumulator[item] = item === decisionLabel;
      return accumulator;
    }, {});

    setChecklist((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        decision: decisionLabel,
        itemChecks: nextItemChecks,
      },
    }));
  };

  const saveChecklistEntries = async (sectionKey = "") => {
    if (!selectedProject || !user?.uid) {
      toast.error("Select a report before saving the checklist.");
      return;
    }

    setSaving(true);
    setSavingSectionKey(sectionKey || "__all__");
    try {
      await setDoc(
        doc(db, "report_review_checklists", `${selectedProject.id}_${user.uid}`),
        {
          projectDocId: selectedProject.id,
          projectId: selectedProject.projectId || "",
          projectName: selectedProject.projectName || "",
          clientName: selectedProject.clientName || selectedProject.client || "",
          externalReviewerId: user.uid,
          externalReviewerName:
            user.fullName || user.name || user.displayName || user.email || "External Reviewer",
          sections: sectionKey
            ? { [sectionKey]: checklist[sectionKey] }
            : checklist,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );

      toast.success(
        sectionKey
          ? `${CHECKLIST_SECTIONS.find((section) => section.key === sectionKey)?.title || "Section"} saved successfully.`
          : "Checklist saved successfully.",
      );
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to save the checklist."));
    } finally {
      setSaving(false);
      setSavingSectionKey("");
    }
  };

  const handleSaveChecklist = async () => {
    await saveChecklistEntries();
  };

  const handleSaveSection = async (sectionKey) => {
    if (!sectionKey) {
      return;
    }
    await saveChecklistEntries(sectionKey);
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
      <div className="space-y-6 p-4 lg:p-6">
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

        <div className="grid gap-6 xl:grid-cols-2">
          

          <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
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
                    <div
                      key={section.key}
                      className="rounded-[1.5rem] border border-slate-800 bg-slate-950/50 p-5"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xs font-black text-orange-400">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-white">{section.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveSection(section.key)}
                          disabled={!selectedProjectId || saving || loadingChecklist}
                          className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-600/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-300 transition hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Save size={14} />
                          {savingSectionKey === section.key ? "Saving..." : "Save Section"}
                        </button>
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
                                  onClick={() => handleDecisionChange(section.key, item)}
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
                                  {item}
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

                      {section.key !== "approvalDecision" ? (
                        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                              Status
                            </span>
                            <select
                              value={checklist[section.key]?.status || "Yet to Start"}
                              onChange={(event) =>
                                handleSectionChange(section.key, "status", event.target.value)
                              }
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
                              value={checklist[section.key]?.observation || ""}
                              onChange={(event) =>
                                handleSectionChange(section.key, "observation", event.target.value)
                              }
                              rows={4}
                              placeholder={`Add observations for ${section.title.toLowerCase()}...`}
                              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
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
