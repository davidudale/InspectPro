import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { useAuth } from "../../../Auth/AuthContext";
import { collection, doc, onSnapshot, query, updateDoc } from "firebase/firestore";
import { 
  Briefcase, Search, ArrowUpRight, 
  MapPin, Users, Edit3, ShieldAlert, MoreVertical
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import SuperAdminNavbar from "../../SuperAdminNavbar";
import SuperAdminSidebar from "../../SuperAdminSidebar";
import ControlCenterTableShell from "../../../Common/ControlCenterTableShell";
import TableQueryControls from "../../../Common/TableQueryControls";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../../utils/tableGrouping";
import { distinctRowsByLatest } from "../../../../utils/distinctRows";

const ProjectList = () => {
  const { user } = useAuth();

  const getNavbarAndSidebar = () => {
    if (user?.role === "Super_Admin") {
      return { navbar: <SuperAdminNavbar />, sidebar: <SuperAdminSidebar /> };
    }
    return { navbar: <AdminNavbar />, sidebar: <AdminSidebar /> };
  };

  const { navbar, sidebar } = getNavbarAndSidebar();

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
  const formatDateTime = (value) => {
    if (!value) return "N/A";
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleString();
    }
    if (value instanceof Date) {
      return value.toLocaleString();
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
    return (
      project?.inspectionEndDate ||
      project?.approvedAt ||
      project?.confirmedAt ||
      project?.confirmationDate ||
      project?.updatedAt ||
      project?.lastUpdated ||
      null
    );
  };
  const getSubmittedAt = (project) =>
    project?.submittedAt ||
    project?.reportSubmittedAt ||
    project?.report?.submittedAt ||
    (String(getOperationalStatus(project) || "")
      .trim()
      .toLowerCase()
      .startsWith("pending confirmation")
      ? project?.report?.updatedAt ||
        project?.updatedAt ||
        project?.lastUpdated ||
        project?.inspectionStartedAt ||
        null
      : null);
  const getPendingConfirmationSubmittedAt = (project) =>
    project?.report?.updatedAt ||
    project?.updatedAt ||
    project?.lastUpdated ||
    project?.inspectionStartedAt ||
    null;
  const getInspectionBy = (project) =>
    project?.inspectorName ||
    project?.assignedInspectorName ||
    project?.report?.signoff?.inspector ||
    project?.report?.submittedBy ||
    "N/A";
  const getLatestExternalDecision = (project) =>
    latestExternalDecisionByProject.get(project?.id || "") ||
    latestExternalDecisionByProject.get(project?.projectId || "") ||
    null;
  const getDecisionAt = (project) =>
    (() => {
      const latestExternalDecision = getLatestExternalDecision(project);
      const externalDecision = String(latestExternalDecision?.decision || "")
        .trim()
        .toLowerCase();

      if (externalDecision === "approved" || externalDecision === "rejected") {
        return (
          latestExternalDecision?.createdAt ||
          latestExternalDecision?.updatedAt ||
          latestExternalDecision?.adminUpdatedAt ||
          null
        );
      }

      const normalizedStatus = String(getOperationalStatus(project) || "").trim().toLowerCase();

      if (
        normalizedStatus === "report accepted" ||
        normalizedStatus === "reported accepted"
      ) {
        return (
          project?.reportAcceptedAt ||
          project?.acceptedAt ||
          project?.approvedAt ||
          project?.confirmedAt ||
          project?.confirmationDate ||
          project?.updatedAt ||
          project?.lastUpdated ||
          null
        );
      }

      if (
        normalizedStatus === "report rejected" ||
        normalizedStatus === "reported rejected"
      ) {
        return (
          project?.reportRejectedAt ||
          project?.rejectedAt ||
          project?.returnedAt ||
          project?.declinedAt ||
          project?.updatedAt ||
          project?.lastUpdated ||
          null
        );
      }

      return (
        project?.approvedAt ||
        project?.confirmedAt ||
        project?.confirmationDate ||
        project?.returnedAt ||
        project?.rejectedAt ||
        project?.declinedAt ||
        null
      );
    })();
  const getDecisionBy = (project) =>
    (() => {
      const latestExternalDecision = getLatestExternalDecision(project);
      const externalDecision = String(latestExternalDecision?.decision || "")
        .trim()
        .toLowerCase();

      if (externalDecision === "approved" || externalDecision === "rejected") {
        return (
          latestExternalDecision?.externalReviewerName ||
          latestExternalDecision?.externalReviewerEmail ||
          latestExternalDecision?.createdBy ||
          "N/A"
        );
      }

      const normalizedStatus = String(getOperationalStatus(project) || "").trim().toLowerCase();

      if (
        normalizedStatus === "report accepted" ||
        normalizedStatus === "reported accepted"
      ) {
        return (
          project?.reportAcceptedBy ||
          project?.acceptedBy ||
          project?.approvedBy ||
          project?.confirmedBy ||
          "N/A"
        );
      }

      if (
        normalizedStatus === "report rejected" ||
        normalizedStatus === "reported rejected"
      ) {
        return (
          project?.reportRejectedBy ||
          project?.rejectedBy ||
          project?.returnedBy ||
          project?.declinedBy ||
          "N/A"
        );
      }

      return (
        project?.approvedBy ||
        project?.confirmedBy ||
        project?.returnedBy ||
        project?.rejectedBy ||
        project?.declinedBy ||
        "N/A"
      );
    })();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const persistedSubmissionIdsRef = useRef(new Set());

  useEffect(() => {
    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort(
          (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
        );
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const feedbackQuery = query(collection(db, "external_feedback"));
    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      setFeedbackEntries(
        snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        })),
      );
    });

    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    projects.forEach((project) => {
      const normalizedStatus = String(getOperationalStatus(project) || "").trim().toLowerCase();
      if (!normalizedStatus.startsWith("pending confirmation")) {
        return;
      }

      if (
        project?.submittedAt ||
        project?.reportSubmittedAt ||
        project?.report?.submittedAt ||
        persistedSubmissionIdsRef.current.has(project.id)
      ) {
        return;
      }

      const submittedAt = getPendingConfirmationSubmittedAt(project);
      const submittedBy =
        project?.submittedBy ||
        project?.report?.submittedBy ||
        project?.inspectorName ||
        project?.assignedInspectorName ||
        "";

      if (!submittedAt || !submittedBy) {
        return;
      }

      persistedSubmissionIdsRef.current.add(project.id);
      updateDoc(doc(db, "projects", project.id), {
        submittedAt,
        submittedBy,
      }).catch(() => {
        persistedSubmissionIdsRef.current.delete(project.id);
      });
    });
  }, [projects]);

  const getOperationalStatusBadgeTheme = (status) => {
    const normalizedStatus = String(status || "").trim().toLowerCase();

    if (
      normalizedStatus.startsWith("report accepted") ||
      normalizedStatus.startsWith("reported accepted") ||
      normalizedStatus === "approved"
    ) {
      return {
        wrapper:
          "border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]",
        dot: "bg-emerald-400",
      };
    }

    if (
      normalizedStatus.startsWith("report rejected") ||
      normalizedStatus.startsWith("reported rejected") ||
      normalizedStatus.includes("rejected")
    ) {
      return {
        wrapper:
          "border-rose-400/40 bg-rose-500/15 text-rose-200 shadow-[0_0_0_1px_rgba(244,63,94,0.08)]",
        dot: "bg-rose-400",
      };
    }

    if (normalizedStatus.includes("returned for correction")) {
      return {
        wrapper:
          "border-sky-400/40 bg-sky-500/15 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]",
        dot: "bg-sky-400",
      };
    }

    if (normalizedStatus.includes("client review")) {
      return {
        wrapper:
          "border-sky-400/40 bg-sky-500/15 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]",
        dot: "bg-sky-400",
      };
    }

    if (
      normalizedStatus.startsWith("passed and forwarded") ||
      normalizedStatus.startsWith("pending confirmation")
    ) {
      return {
        wrapper:
          "border-sky-400/40 bg-sky-500/15 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]",
        dot: "bg-sky-400",
      };
    }

    if (normalizedStatus.startsWith("in progress")) {
      return {
        wrapper:
          "border-sky-400/40 bg-sky-500/15 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]",
        dot: "bg-sky-400",
      };
    }

    if (normalizedStatus.startsWith("not started")) {
      return {
        wrapper:
          "border-sky-400/40 bg-sky-500/15 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]",
        dot: "bg-sky-400",
      };
    }

    if (normalizedStatus === "planned") {
      return {
        wrapper:
          "border-sky-400/40 bg-sky-500/15 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]",
        dot: "bg-sky-400",
      };
    }

    return {
        wrapper:
          "border-sky-400/40 bg-sky-500/15 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]",
        dot: "bg-sky-400",
      };
  };

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    const sortedRows = [...projects]
      .filter(
        (project) =>
          project.projectName?.toLowerCase().includes(normalizedSearch) ||
          (project.clientName || project.client || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          project.projectId?.toLowerCase().includes(normalizedSearch),
      )
      .filter(
        (project) =>
          statusFilter === "all" ||
          String(getOperationalStatus(project)).toLowerCase() === statusFilter,
      )
      .sort(
        (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
      );
    return distinctRowsByLatest(
      sortedRows,
      (project) => project.id || project.projectId,
      (project) => toMillis(getRowTimestamp(project)),
    );
  }, [projects, searchTerm, statusFilter]);

  const latestExternalDecisionByProject = useMemo(() => {
    const nextMap = new Map();

    feedbackEntries.forEach((entry) => {
      const projectDocId = String(entry.projectDocId || "").trim();
      const projectCode = String(entry.projectId || "").trim();
      const decision = String(entry.decision || "").trim().toLowerCase();
      const entryTimestamp = Math.max(
        toMillis(entry.createdAt),
        toMillis(entry.updatedAt),
        toMillis(entry.adminUpdatedAt),
      );

      if (!["approved", "rejected"].includes(decision)) {
        return;
      }

      const latestForDoc = projectDocId ? nextMap.get(projectDocId) : null;
      const latestForCode = projectCode ? nextMap.get(projectCode) : null;

      if (
        projectDocId &&
        (!latestForDoc ||
          entryTimestamp >=
            Math.max(
              toMillis(latestForDoc.createdAt),
              toMillis(latestForDoc.updatedAt),
              toMillis(latestForDoc.adminUpdatedAt),
            ))
      ) {
        nextMap.set(projectDocId, entry);
      }

      if (
        projectCode &&
        (!latestForCode ||
          entryTimestamp >=
            Math.max(
              toMillis(latestForCode.createdAt),
              toMillis(latestForCode.updatedAt),
              toMillis(latestForCode.adminUpdatedAt),
            ))
      ) {
        nextMap.set(projectCode, entry);
      }
    });

    return nextMap;
  }, [feedbackEntries]);

  const groupedProjects = useMemo(
    () =>
      groupRowsByOption(filteredProjects, groupBy, [
        {
          value: "status",
          label: "Operational Status",
          getValue: (project) => getOperationalStatus(project),
          emptyLabel: "Unknown Status",
        },
        {
          value: "client",
          label: "Client",
          getValue: (project) => project.clientName || project.client,
          emptyLabel: "Unassigned Client",
        },
      ]),
    [filteredProjects, groupBy],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(projects.map((project) => getOperationalStatus(project)).filter(Boolean))),
    [projects],
  );

  return (
    <>
      <ControlCenterTableShell
        navbar={navbar}
        sidebar={sidebar}
        title="Project Directory"
        subtitle="Monitor every project, review lifecycle status, and open admin actions from one grid."
        icon={<Briefcase size={18} />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by ID, client, or project name..."
        summary={`${filteredProjects.length} Project${filteredProjects.length === 1 ? "" : "s"}`}
        loading={false}
        hasData={filteredProjects.length > 0}
        emptyTitle="No Active Projects Found"
        emptyDescription="Projects created in setup will appear here for editing, deletion, and preview."
        toolbar={
          <TableQueryControls
            filters={[
              {
                key: "status",
                label: "Status Filter",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "all", label: "All Statuses" },
                  ...statusOptions.map((status) => ({
                    value: status.toLowerCase(),
                    label: status,
                  })),
                ],
              },
            ]}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOptions={[
              { value: TABLE_GROUP_NONE, label: "No Grouping" },
              { value: "status", label: "Operational Status" },
              { value: "client", label: "Client" },
            ]}
          />
        }
      >
        <div className="flex items-center justify-end border-b border-slate-800/80 bg-slate-950/20 px-4 py-4">
          <button 
            onClick={() => navigate("/projects")}
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest"
          >
            <Briefcase size={14} /> Add Project
          </button>
        </div>
        <div className="table-scroll-region max-h-[68vh] overflow-auto">
          <table className="w-full min-w-[1400px] text-left border-collapse">
                    {(() => {
                      let serialNumber = 0;
                      return (
                        <>
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0b1326]">
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">S/N</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Identity</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Client & Industry</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Facility Location</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Inspection Start Date</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Inspection End Date</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Status</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Inspection By</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Report Acceptance/Rejection Date</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Report Acceptance/Rejection By</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Report View</th>
                        <th className="px-3 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {groupedProjects.map((group) => (
                        <React.Fragment key={group.key}>
                          {groupBy !== TABLE_GROUP_NONE ? (
                            <tr className="bg-[#08101f]">
                              <td
                                colSpan="13"
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
                            const submittedAt = getSubmittedAt(project);
                            const inspectionBy = getInspectionBy(project);
                            const decisionAt = getDecisionAt(project);
                            const decisionBy = getDecisionBy(project);
                            const statusBadgeTheme = getOperationalStatusBadgeTheme(
                              operationalStatus,
                            );
                            const isReportAccepted =
                              String(operationalStatus || "").trim().toLowerCase() ===
                              "report accepted";
                            const isClientReviewInProgress =
                              String(operationalStatus || "").trim().toLowerCase() ===
                              "client review in progress";
                            const normalizedReportViewMode = String(project?.reportViewMode || "")
                              .trim()
                              .toLowerCase();
                            const normalizedReportViewStatus = String(
                              project?.status || operationalStatus || project?.report?.status || "",
                            )
                              .trim()
                              .toLowerCase();
                            const reportViewCode =
                              normalizedReportViewMode === "external" ||
                              ["client review in progress", "report accepted", "report rejected"].includes(
                                normalizedReportViewStatus,
                              )
                                ? "External"
                                : "Internal";
                            return (
                        <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-3 py-4 text-xs font-bold text-slate-400">
                            {++serialNumber}
                          </td>
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
                              {formatDateTime(projectStartDate)}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {projectEndDate ? formatDateTime(projectEndDate) : "Pending"}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${statusBadgeTheme.wrapper}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusBadgeTheme.dot}`}></span>
                              {operationalStatus}
                            </div>
                          </td>
                          {/*<td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {formatDateTime(submittedAt)}
                            </div>
                          </td>*/}
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {inspectionBy}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {formatDateTime(decisionAt)}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {decisionBy}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="inline-flex min-w-10 text-xs items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-[0.3em] text-white">
                              {reportViewCode}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              {!isReportAccepted ? (
                                <button 
                                  onClick={() => {
                                    if (isClientReviewInProgress) return;
                                    navigate(`/viewprojects/project-edit/${project.projectId || project.id}`, { state: { editMode: true, project } });
                                  }}
                                  disabled={isClientReviewInProgress}
                                  className={`p-2.5 border rounded-xl shadow-inner transition-all ${
                                    isClientReviewInProgress
                                      ? "bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed opacity-60"
                                      : "bg-slate-950 border-slate-800 text-slate-500 hover:text-blue-500 hover:border-blue-500/50"
                                  }`}
                                  title={isClientReviewInProgress ? "Edit locked during client review" : "Edit Project"}
                                >
                                  <Edit3 size={14} />
                                </button>
                              ) : null}
                                   
                              <button 
                                onClick={() => navigate(`/admin/project/${project.id}`)}
                                className="ml-2 p-2.5 bg-orange-600 border border-orange-500/20 text-white hover:bg-orange-700 transition-all rounded-xl shadow-lg shadow-orange-900/20"
                                title="Template Preview"
                              >
                                <ArrowUpRight size={14} />
                              </button>
                              <button 
                                onClick={() => navigate("/admin/external-feedback")}
                                className="p-2.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500/50 transition-all rounded-xl shadow-inner"
                                title="Client Feedback"
                                aria-label="Client Feedback"
                              >
                                <ShieldAlert size={14} />
                              </button> 
                            </div>
                            <MoreVertical size={16} className="text-slate-800 group-hover:hidden inline-block ml-auto" />
                          </td>
                        </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                        </>
                      );
                    })()}
                  </table>
        </div>
        <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                    Total Registered Reports: {filteredProjects.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time sync active</span>
                  </div>
        </div>
      </ControlCenterTableShell>
    </>
  );
};

export default ProjectList;
