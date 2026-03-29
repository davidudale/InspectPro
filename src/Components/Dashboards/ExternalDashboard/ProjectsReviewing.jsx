import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { 
  Briefcase, Search, ArrowUpRight, 
  MapPin, Users, ShieldAlert, MessageSquareText, X, CheckCircle2, XCircle
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../Auth/AuthContext";
import ExternalNavbar from "./ExternalNavbar";
import ExternalSideBar from "./ExternalSideBar";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";
import TableQueryControls from "../../Common/TableQueryControls";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../utils/tableGrouping";
import { getToastErrorMessage } from "../../../utils/toast";

const ProjectReviewing = () => {
  const { user } = useAuth();
  const formatDate = (value) => {
    if (!value) return "N/A";
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleDateString();
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleDateString();
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
  const getRowTimestamp = (row) =>
    row?.updatedAt ||
    row?.lastUpdated ||
    row?.createdAt ||
    row?.timestamp ||
    row?.startDate ||
    0;
  const getProjectStartDate = (project) =>
    project?.startDate ||
    project?.deploymentDate ||
    project?.inspectionStartedAt ||
    project?.createdAt ||
    project?.timestamp ||
    null;
  const getProjectEndDate = (project) => {
    const status = String(project?.status || "").toLowerCase();
    if (status !== "approved") return null;
    return (
      project?.approvedAt ||
      project?.confirmedAt ||
      project?.confirmationDate ||
      project?.updatedAt ||
      project?.lastUpdated ||
      null
    );
  };
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const [feedbackProject, setFeedbackProject] = useState(null);
  const [feedbackDecision, setFeedbackDecision] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      return undefined;
    }

    const q = query(
      collection(db, "projects"),
      where("externalReviewerId", "==", user.uid),
      where("status", "==", "Approved"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const filteredProjects = projects
    .filter(
      (p) =>
        p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.clientName || p.client || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
          p.projectId?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter(
      (project) =>
        clientFilter === "all" ||
        String(project.clientName || project.client || "").toLowerCase() === clientFilter,
    )
    .sort(
      (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
    );

  const getOperationalStatus = (project) => {
    const topLevelStatus = String(project?.status || "").trim();
    const reportStatus = String(project?.report?.status || "").trim();
    const topLower = topLevelStatus.toLowerCase();
    const reportLower = reportStatus.toLowerCase();

    // Primary source: top-level project workflow status (kept in sync across stages).
    if (topLevelStatus) {
      return topLevelStatus;
    }

    // Fallback for legacy rows where top-level status has not been synchronized yet.
    if (reportStatus && !["draft", "new"].includes(reportLower)) {
      return reportStatus;
    }

    // Safety fallback for rows where start timestamp exists but status text was not synchronized.
    if (
      project?.inspectionStartedAt &&
      (topLower.startsWith("not started") || !topLevelStatus)
    ) {
      return `In Progress - ${project?.inspectorName || "Inspector"}`;
    }

    return "Planned";
  };

  const groupedProjects = groupRowsByOption(filteredProjects, groupBy, [
    {
      value: "client",
      label: "Client",
      getValue: (project) => project.clientName || project.client,
      emptyLabel: "Unassigned Client",
    },
    {
      value: "location",
      label: "Location",
      getValue: (project) => project.locationName || project.location,
      emptyLabel: "Unassigned Location",
    },
  ]);

  const openFeedbackModal = (project) => {
    setFeedbackProject(project);
    setFeedbackDecision("");
    setFeedbackMessage("");
  };

  const closeFeedbackModal = () => {
    if (isSubmittingFeedback) return;
    setFeedbackProject(null);
    setFeedbackDecision("");
    setFeedbackMessage("");
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackProject?.id) {
      toast.error("Project reference is missing.");
      return;
    }

    if (!user?.uid) {
      toast.error("You must be signed in to submit feedback.");
      return;
    }

    if (!feedbackDecision) {
      toast.error("Choose Approve or Reject before submitting.");
      return;
    }

    const normalizedMessage = feedbackMessage.trim();
    if (!normalizedMessage) {
      toast.error(
        feedbackDecision === "Approved"
          ? "Please enter a commendation before approving."
          : "Please enter feedback before rejecting.",
      );
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, "external_feedback"), {
        projectDocId: feedbackProject.id,
        projectId: feedbackProject.projectId || "",
        projectName: feedbackProject.projectName || "",
        clientName: feedbackProject.clientName || feedbackProject.client || "",
        requiredTechnique:
          feedbackProject.selectedTechnique ||
          feedbackProject.reportTemplate ||
          feedbackProject.inspectionTypeCode ||
          feedbackProject.inspectionTypeName ||
          "General Inspection",
        externalReviewerId: user.uid,
        externalReviewerName:
          user.fullName || user.name || user.displayName || user.email || "External Reviewer",
        externalReviewerEmail: user.email || "",
        adminRecipient: "Admin",
        subject:
          feedbackDecision === "Approved"
            ? "External review approved"
            : "External review rejected",
        message: normalizedMessage,
        decision: feedbackDecision,
        status: "New",
        createdAt: serverTimestamp(),
      });

      toast.success(
        feedbackDecision === "Approved"
          ? "Approval and commendation sent to admin."
          : "Rejection feedback sent to admin.",
      );
      closeFeedbackModal();
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to submit your feedback."));
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <>
    <ControlCenterTableShell
      navbar={<ExternalNavbar />}
      sidebar={<ExternalSideBar />}
      title="Projects Review"
       icon={<Briefcase size={18} />}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by ID, client, or project name..."
      summary={`${filteredProjects.length} Assigned Project${filteredProjects.length === 1 ? "" : "s"}`}
     
      loading={false}
      hasData={filteredProjects.length > 0}
      emptyTitle="No Approved Projects Found"
      emptyDescription="Approved projects assigned to your reviewer profile will appear here."
      toolbar={
        <TableQueryControls
          filters={[
            {
              key: "client",
              label: "Client Filter",
              value: clientFilter,
              onChange: setClientFilter,
              options: [
                { value: "all", label: "All Clients" },
                ...Array.from(
                  new Set(projects.map((project) => project.clientName || project.client).filter(Boolean)),
                ).map((client) => ({
                  value: String(client).toLowerCase(),
                  label: client,
                })),
              ],
            },
          ]}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupOptions={[
            { value: TABLE_GROUP_NONE, label: "No Grouping" },
            { value: "client", label: "Client" },
            { value: "location", label: "Location" },
          ]}
        />
      }
    >
      <div className="table-scroll-region max-h-[68vh] overflow-auto">
        <table className="w-full min-w-[900px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0b1326]">
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Identity</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Client & Industry</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Facility Location</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Inspection Start Date</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Inspection End Date</th>
                        {/*<th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Status</th>*/}
                        <th className="px-3 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {groupedProjects.map((group) => (
                        <React.Fragment key={group.key}>
                          {groupBy !== TABLE_GROUP_NONE ? (
                            <tr className="bg-[#08101f]">
                              <td
                                colSpan="6"
                                className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                              >
                                {group.label} ({group.items.length})
                              </td>
                            </tr>
                          ) : null}
                      {group.items.map((project) => {
                        const operationalStatus = getOperationalStatus(project);
                        const projectStartDate = getProjectStartDate(project);
                        const projectEndDate = getProjectEndDate(project);
                        const isInProgress = operationalStatus
                          .toLowerCase()
                          .startsWith("in progress");
                        return (
                        <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 group-hover:border-orange-500/50 transition-all shadow-inner">
                                <Briefcase size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-orange-500 transition-colors">
                                  {project.projectName}
                                </p>
                                <p className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase">{project.projectId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-slate-600" />
                              <div>
                                <p className="text-xs font-semibold text-slate-300 uppercase">{project.clientName || project.client || "N/A"}</p>
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Oil & Gas Sector</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-orange-500/50" />
                              <span className="text-xs font-medium">{project.locationName || project.location || "On-Shore Terminal"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {formatDate(projectStartDate)}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {projectEndDate ? formatDate(projectEndDate) : "Pending"}
                            </div>
                          </td>
                          {/*<td className="p-6">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                              isInProgress
                                ? 'border-orange-500/50 text-orange-500 bg-orange-500/5' 
                                : 'border-slate-700 text-slate-500 bg-slate-800/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isInProgress ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`}></span>
                              {operationalStatus}
                            </div>
                          </td>*/}
                          <td className="px-3 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 ">
                              <button 
                                onClick={() => navigate(`/admin/project/${project.id}`)}
                                className="ml-2 p-2 text-[10px] bg-orange-600 border border-orange-500/20 text-white hover:bg-orange-700 transition-all rounded-xl shadow-lg shadow-orange-900/20"
                                title="View Report"
                              >
                                View Report
                              </button>
                                <button 
                                onClick={() => openFeedbackModal(project)}
                                className="ml-2 p-2 text-[10px] bg-orange-600 border border-orange-500/20 text-white hover:bg-orange-700 transition-all rounded-xl shadow-lg shadow-orange-900/20"
                                title="Send Feedback"
                              >
                                Send Feedback
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/30 p-4">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                    Total Registered Reports: {filteredProjects.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time sync active</span>
                  </div>
      </div>
    </ControlCenterTableShell>

    {feedbackProject ? (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
        <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-800 bg-[#08101f] shadow-[0_28px_80px_rgba(2,6,23,0.7)]">
          <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
                Feedback Review
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                {feedbackProject.projectName || "Unnamed Project"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Choose your decision first. Approval opens a commendation form, while rejection opens a corrective feedback form.
              </p>
            </div>
            <button
              type="button"
              onClick={closeFeedbackModal}
              className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-400 transition-colors hover:text-white"
              aria-label="Close feedback modal"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div className="rounded-2xl border border-slate-800 bg-[#060b17] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-orange-400">
                  <MessageSquareText size={18} />
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>
                    <span className="font-black uppercase text-slate-500">Project ID:</span>{" "}
                    {feedbackProject.projectId || feedbackProject.id}
                  </p>
                  <p>
                    <span className="font-black uppercase text-slate-500">Client:</span>{" "}
                    {feedbackProject.clientName || feedbackProject.client || "N/A"}
                  </p>
                  <p>
                    <span className="font-black uppercase text-slate-500">Location:</span>{" "}
                    {feedbackProject.locationName || feedbackProject.location || "N/A"}
                  </p>
                  <p>
                    <span className="font-black uppercase text-slate-500">Technique:</span>{" "}
                    {feedbackProject.selectedTechnique ||
                      feedbackProject.reportTemplate ||
                      feedbackProject.inspectionTypeCode ||
                      feedbackProject.inspectionTypeName ||
                      "General Inspection"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setFeedbackDecision("Approved");
                  setFeedbackMessage("");
                }}
                className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                  feedbackDecision === "Approved"
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-slate-800 bg-[#060b17] hover:border-emerald-500/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                      Approve
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Open a commendation form for positive review notes.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeedbackDecision("Rejected");
                  setFeedbackMessage("");
                }}
                className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                  feedbackDecision === "Rejected"
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-slate-800 bg-[#060b17] hover:border-rose-500/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-rose-500/10 p-2 text-rose-300">
                    <XCircle size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                      Reject
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Open a feedback form for corrections or concerns.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {feedbackDecision ? (
              <div className="rounded-2xl border border-slate-800 bg-[#060b17] p-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {feedbackDecision === "Approved"
                      ? "Commendation Form"
                      : "Feedback Form"}
                  </span>
                  <textarea
                    rows="5"
                    value={feedbackMessage}
                    onChange={(event) => setFeedbackMessage(event.target.value)}
                    placeholder={
                      feedbackDecision === "Approved"
                        ? "Highlight what was done well, what is ready, and any commendations for the report package..."
                        : "Explain what needs correction, missing details, or reasons for rejection..."
                    }
                    className="mt-3 w-full rounded-2xl border border-slate-700 bg-[#0a1224] px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeFeedbackModal}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-300 transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/project/${feedbackProject.id}`)}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-100 transition-colors hover:border-orange-500/40 hover:text-white"
            >
              View Report
            </button>
            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={!feedbackDecision || isSubmittingFeedback}
              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-500/50"
            >
              {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
};

export default ProjectReviewing;
