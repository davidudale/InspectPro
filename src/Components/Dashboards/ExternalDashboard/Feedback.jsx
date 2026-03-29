import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import {
  Briefcase,
  MessageSquareText,
  Search,
  ShieldAlert,
  Clock3,
  CheckCircle2,
  XCircle,
  MapPin,
  ClipboardCheck
} from "lucide-react";
import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../utils/toast";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import ExternalNavbar from "./ExternalNavbar";
import ExternalSideBar from "./ExternalSideBar";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";
import TableQueryControls from "../../Common/TableQueryControls";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../utils/tableGrouping";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleString();
};

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  return 0;
};

const Feedback = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const [loading, setLoading] = useState(true);
  const [submittingProjectId, setSubmittingProjectId] = useState("");
  const [rejectingProject, setRejectingProject] = useState(null);
  const [rejectionFeedback, setRejectionFeedback] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const approvedProjectsRef = query(
      collection(db, "projects"),
      where("externalReviewerId", "==", user.uid),
      where("status", "==", "Approved"),
    );

    const unsubscribe = onSnapshot(approvedProjectsRef, (snapshot) => {
      const nextProjects = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setProjects(nextProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setFeedbackEntries([]);
      return undefined;
    }

    const feedbackRef = query(
      collection(db, "external_feedback"),
      where("externalReviewerId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(feedbackRef, (snapshot) => {
      setFeedbackEntries(
        snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        })),
      );
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const latestDecisionByProject = useMemo(() => {
    const nextMap = new Map();

    feedbackEntries.forEach((entry) => {
      const projectDocId = String(entry.projectDocId || "").trim();
      const projectCode = String(entry.projectId || "").trim();
      const entryTimestamp = toMillis(entry.createdAt);
      const latestForDoc = projectDocId ? nextMap.get(projectDocId) : null;
      const latestForCode = projectCode ? nextMap.get(projectCode) : null;

      if (projectDocId && (!latestForDoc || entryTimestamp >= toMillis(latestForDoc.createdAt))) {
        nextMap.set(projectDocId, entry);
      }

      if (projectCode && (!latestForCode || entryTimestamp >= toMillis(latestForCode.createdAt))) {
        nextMap.set(projectCode, entry);
      }
    });

    return nextMap;
  }, [feedbackEntries]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const term = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !term ||
          String(project.projectName || "").toLowerCase().includes(term) ||
          String(project.projectId || "").toLowerCase().includes(term) ||
          String(
            project.selectedTechnique ||
              project.reportTemplate ||
              project.inspectionTypeCode ||
              project.inspectionTypeName ||
              "",
          )
            .toLowerCase()
            .includes(term);
        const latestDecision =
          latestDecisionByProject.get(project.id) ||
          latestDecisionByProject.get(project.projectId || "");
        const matchesDecision =
          decisionFilter === "all" ||
          String(latestDecision?.decision || "Pending").toLowerCase() === decisionFilter;
        return matchesSearch && matchesDecision;
      }),
    [decisionFilter, latestDecisionByProject, projects, searchTerm],
  );

  const groupedProjects = useMemo(
    () =>
      groupRowsByOption(filteredProjects, groupBy, [
        {
          value: "decision",
          label: "Decision",
          getValue: (project) => {
            const latestDecision =
              latestDecisionByProject.get(project.id) ||
              latestDecisionByProject.get(project.projectId || "");
            return latestDecision?.decision || "Pending";
          },
          emptyLabel: "Pending",
        },
        {
          value: "requiredTechnique",
          label: "Required Technique",
          getValue: (project) =>
            project.selectedTechnique ||
            project.reportTemplate ||
            project.inspectionTypeCode ||
            project.inspectionTypeName,
          emptyLabel: "General Inspection",
        },
      ]),
    [filteredProjects, groupBy, latestDecisionByProject],
  );

  const handleDecision = async (project, decision, rejectionMessage = "") => {
    const projectKey = project.id;
    if (!user?.uid) {
      toast.error("You must be signed in to submit a decision.");
      return;
    }

    const normalizedDecision = decision === "Rejected" ? "Rejected" : "Approved";
    const normalizedFeedback = String(rejectionMessage || "").trim();
    if (normalizedDecision === "Rejected" && !normalizedFeedback) {
      toast.error("Please provide feedback before rejecting.");
      return;
    }
    const submittingKey = `${projectKey}:${normalizedDecision}`;
    const subject =
      normalizedDecision === "Approved"
        ? "External review approved"
        : "External review rejected";
    const message =
      normalizedDecision === "Approved"
        ? "The external reviewer approved this report package."
        : normalizedFeedback;

    setSubmittingProjectId(submittingKey);
    try {
      await addDoc(collection(db, "external_feedback"), {
        projectDocId: project.id,
        projectId: project.projectId || "",
        projectName: project.projectName || "",
        clientName: project.clientName || project.client || "",
        externalReviewerId: user.uid,
        externalReviewerName:
          user.fullName || user.name || user.displayName || user.email || "External Reviewer",
        externalReviewerEmail: user.email || "",
        adminRecipient: "Admin",
        subject,
        message,
        decision: normalizedDecision,
        status: "New",
        createdAt: serverTimestamp(),
      });

      toast.success(`Project ${normalizedDecision.toLowerCase()} and sent to admin.`);
      if (normalizedDecision === "Rejected") {
        setRejectingProject(null);
        setRejectionFeedback("");
      }
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to submit your decision."));
    } finally {
      setSubmittingProjectId("");
    }
  };

  const openRejectModal = (project) => {
    setRejectingProject(project);
    setRejectionFeedback("");
  };

  const closeRejectModal = () => {
    if (submittingProjectId) return;
    setRejectingProject(null);
    setRejectionFeedback("");
  };

  return (
    <>
      <ControlCenterTableShell
        navbar={<ExternalNavbar />}
        sidebar={<ExternalSideBar />}
        title="Feedback Desk"
        icon={<MessageSquareText size={18} />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by ID, required technique, or project name..."
        summary={`${filteredProjects.length} Approved Project${filteredProjects.length === 1 ? "" : "s"}`}
        loading={loading}
        hasData={filteredProjects.length > 0}
        emptyTitle="No Approved Project Feedback Found"
        emptyDescription="Approved projects assigned to your reviewer profile will appear here for approval or rejection."
        toolbar={
          <TableQueryControls
            filters={[
              {
                key: "decision",
                label: "Decision Filter",
                value: decisionFilter,
                onChange: setDecisionFilter,
                options: [
                  { value: "all", label: "All Decisions" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ],
              },
            ]}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOptions={[
              { value: TABLE_GROUP_NONE, label: "No Grouping" },
              { value: "decision", label: "Decision" },
              { value: "requiredTechnique", label: "Required Technique" },
            ]}
          />
        }
      >
        <div className="table-scroll-region max-h-[68vh] overflow-auto">
          <table className="w-full min-w-[1040px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#0b1326]">
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  S/N
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Project Identity
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Required Technique
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Facility
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Timeline for Review
                </th>
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Decision
                </th>
                <th className="px-3 py-3 text-right text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {groupedProjects.map((group) => (
                <React.Fragment key={group.key}>
                  {groupBy !== TABLE_GROUP_NONE ? (
                    <tr className="bg-[#08101f]">
                      <td
                        colSpan="7"
                        className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                      >
                        {group.label} ({group.items.length})
                      </td>
                    </tr>
                  ) : null}
                  {group.items.map((project, index) => {
                const latestDecision =
                  latestDecisionByProject.get(project.id) ||
                  latestDecisionByProject.get(project.projectId || "");
                const decisionText = latestDecision?.decision || "Pending";
                const isApproved = String(decisionText).toLowerCase() === "approved";
                const isRejected = String(decisionText).toLowerCase() === "rejected";

                return (
                  <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-3 py-4 text-xs font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 shadow-inner">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase group-hover:text-orange-500 transition-colors">
                            {project.projectName || "Unnamed Project"}
                          </p>
                          <p className="text-[9px] font-mono text-slate-500 uppercase">
                            {project.projectId || project.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-[11px] text-slate-300 font-semibold uppercase">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck size={14} className="text-slate-600" />
                          <div>
                            <p className="text-xs font-semibold text-slate-300 uppercase">
                              {project.selectedTechnique ||
                                project.reportTemplate ||
                                project.inspectionTypeCode ||
                                project.inspectionTypeName ||
                                "General Inspection"}
                            </p>
                          </div>
                        </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={14} className="text-orange-500/50" />
                        <span className="text-xs font-medium">
                          {project.locationName || project.location || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="min-w-[210px] rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
                        
                        <p className="mt-2 text-slate-300">
                          Approved: {formatDateTime(project.approvedAt || project.confirmedAt || project.updatedAt)}
                        </p>
                        
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="min-w-[180px]">
                        <span
                          className={`inline-flex rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] ${
                            isApproved
                              ? "bg-emerald-500/10 text-emerald-300"
                              : isRejected
                                ? "bg-rose-500/10 text-rose-300"
                                : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {decisionText}
                        </span>
                        <p className="mt-2 text-xs text-slate-500 max-w-xs break-words">
                          {latestDecision
                            ? `Submitted ${formatDateTime(latestDecision.createdAt)}`
                            : "No decision submitted yet."}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecision(project, "Approved")}
                          disabled={submittingProjectId === `${project.id}:Approved`}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.16em] transition-all shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700"
                        >
                          {submittingProjectId === `${project.id}:Approved`
                            ? "Approving..."
                            : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openRejectModal(project)}
                          disabled={submittingProjectId === `${project.id}:Rejected`}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.16em] transition-all shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </ControlCenterTableShell>
      {rejectingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Reject Report</h3>
            <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">
              Share feedback for {rejectingProject.projectName || rejectingProject.projectId || "this project"} before rejecting.
            </p>
            <textarea
              value={rejectionFeedback}
              onChange={(e) => setRejectionFeedback(e.target.value)}
              placeholder="State clearly why this report is being rejected and what should be corrected..."
              className="mt-4 h-36 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 outline-none focus:border-rose-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={submittingProjectId === `${rejectingProject.id}:Rejected`}
                className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold uppercase text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecision(rejectingProject, "Rejected", rejectionFeedback)}
                disabled={submittingProjectId === `${rejectingProject.id}:Rejected`}
                className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submittingProjectId === `${rejectingProject.id}:Rejected`
                  ? "Submitting..."
                  : "Submit Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Feedback;
