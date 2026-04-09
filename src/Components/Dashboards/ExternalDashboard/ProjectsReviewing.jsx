import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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
import { useConfirmDialog } from "../../Common/ConfirmDialog";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../utils/tableGrouping";
import { getToastErrorMessage } from "../../../utils/toast";
import { matchesExternalReviewerProject } from "../../../utils/externalReviewerAccess";

const CHECKLIST_SECTION_TITLES = {
  documentReview: "Document Review",
  findingsValidation: "Findings Validation",
  riskAssessment: "Risk Assessment",
  complianceCheck: "Compliance Check",
  approvalDecision: "Approval Decision",
};
const REVIEW_COLLECTION = "project_verification_reviews";
const LEGACY_REVIEW_COLLECTION = "report_review_checklists";

const ProjectReviewing = () => {
  const { user } = useAuth();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
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
    if (project?.inspectionEndDate) {
      return project.inspectionEndDate;
    }

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
  const [checklistEntries, setChecklistEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const [remarkProject, setRemarkProject] = useState(null);
  const [feedbackProject, setFeedbackProject] = useState(null);
  const [feedbackDecision, setFeedbackDecision] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingRemarkDecision, setIsSubmittingRemarkDecision] = useState(false);
  const reviewVisibleStatuses = [
    "Approved",
    "Client Review In Progress",
    "Report Accepted",
    "Report Rejected",
  ];
  const normalizedReviewerType = String(user?.reviewerType || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const isVerificationLeadOfficer = normalizedReviewerType === "verification_lead_officer";
  const reviewerColumns = [
    {
      idKey: "externalReviewerId",
      nameKey: "externalReviewerName",
      label: "Verification Lead Officer",
    },
    {
      idKey: "externalReviewerId2",
      nameKey: "externalReviewerName2",
      label: "Verification Officer 1",
    },
    {
      idKey: "externalReviewerId3",
      nameKey: "externalReviewerName3",
      label: "Verification Officer 2",
    },
    {
      idKey: "externalReviewerId4",
      nameKey: "externalReviewerName4",
      label: "Verification Officer 3",
    },
    {
      idKey: "externalReviewerId5",
      nameKey: "externalReviewerName5",
      label: "Verification Officer 4",
    },
    {
      idKey: "externalReviewerId6",
      nameKey: "externalReviewerName6",
      label: "Verification Officer 5",
    },
  ];
  const visibleReviewerColumns = isVerificationLeadOfficer
    ? reviewerColumns
    : [{ idKey: "__self__", nameKey: "", label: "My Verification Status" }];

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      return undefined;
    }

    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((project) => matchesExternalReviewerProject(project, user))
      .filter((project) => reviewVisibleStatuses.includes(String(project.status || "").trim()));
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    let consolidatedEntries = [];
    let legacyEntries = [];
    let reviewerUnsubscribes = [];

    const syncEntries = () => {
      setChecklistEntries([...consolidatedEntries, ...legacyEntries]);
    };

    const refreshReviewerSubscriptions = () => {
      reviewerUnsubscribes.forEach((unsubscribe) => unsubscribe());
      reviewerUnsubscribes = projects.map((project) =>
        onSnapshot(
          collection(db, REVIEW_COLLECTION, project.id, "reviewers"),
          (snapshot) => {
            const nextEntries = snapshot.docs.map((docItem) => ({
              id: `${project.id}_${docItem.id}`,
              projectDocId: project.id,
              projectId: project.projectId || "",
              projectName: project.projectName || "",
              clientName: project.clientName || project.client || "",
              ...docItem.data(),
            }));

            consolidatedEntries = [
              ...consolidatedEntries.filter((entry) => entry.projectDocId !== project.id),
              ...nextEntries,
            ];

            syncEntries();
          },
          () => {
            consolidatedEntries = consolidatedEntries.filter((entry) => entry.projectDocId !== project.id);
            syncEntries();
          },
        ),
      );
    };

    refreshReviewerSubscriptions();

    const unsubscribeLegacy = onSnapshot(collection(db, LEGACY_REVIEW_COLLECTION), (snapshot) => {
      legacyEntries = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      syncEntries();
    });

    return () => {
      reviewerUnsubscribes.forEach((unsubscribe) => unsubscribe());
      unsubscribeLegacy();
    };
  }, [projects]);

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
        projectFilter === "all" ||
        String(project.projectName || project.projectId || project.id || "").toLowerCase() === projectFilter,
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
          "border-red-400/40 bg-red-500/15 text-red-200 shadow-[0_0_0_1px_rgba(248,113,113,0.08)]",
        dot: "bg-red-400",
      };
    }

    if (normalizedStatus.includes("client review")) {
      return {
        wrapper:
          "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_0_1px_rgba(217,70,239,0.08)]",
        dot: "bg-fuchsia-400",
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
          "border-amber-400/40 bg-amber-500/15 text-amber-100 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]",
        dot: "bg-amber-400",
      };
    }

    if (normalizedStatus.startsWith("not started")) {
      return {
        wrapper:
          "border-indigo-400/40 bg-indigo-500/15 text-indigo-100 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]",
        dot: "bg-indigo-400",
      };
    }

    if (normalizedStatus === "planned") {
      return {
        wrapper:
          "border-slate-500/40 bg-slate-700/30 text-slate-200 shadow-[0_0_0_1px_rgba(100,116,139,0.08)]",
        dot: "bg-slate-400",
      };
    }

    return {
      wrapper:
        "border-cyan-400/40 bg-cyan-500/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]",
      dot: "bg-cyan-400",
    };
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

  const getProjectRemark = (project) =>
    String(
      project?.returnNote ||
      project?.remark ||
      project?.remarks ||
      project?.adminRemark ||
      project?.adminRemarks ||
      project?.feedback ||
      "",
    ).trim();

  const getChecklistEntryTimestamp = (entry) =>
    Math.max(toMillis(entry?.updatedAt), toMillis(entry?.createdAt));

  const latestChecklistByProjectReviewer = checklistEntries.reduce((map, entry) => {
    const reviewerId = String(entry?.externalReviewerId || "").trim();
    const projectKeys = [
      String(entry?.projectDocId || "").trim(),
      String(entry?.projectId || "").trim(),
    ].filter(Boolean);

    if (!reviewerId || !projectKeys.length) {
      return map;
    }

    projectKeys.forEach((projectKey) => {
      const compositeKey = `${projectKey}|${reviewerId}`;
      const existingEntry = map.get(compositeKey);

      if (
        !existingEntry ||
        getChecklistEntryTimestamp(entry) >= getChecklistEntryTimestamp(existingEntry)
      ) {
        map.set(compositeKey, entry);
      }
    });

    return map;
  }, new Map());

  const getChecklistProgressStatus = (entry) => {
    if (!entry) return "Yet to start";

    const summaryStatus = String(entry?.summary?.status || "").trim();
    if (summaryStatus) {
      const normalizedSummaryStatus = summaryStatus.toLowerCase();
      if (normalizedSummaryStatus === "yet to start") return "Yet to start";
      if (normalizedSummaryStatus === "approved") return "Accepted";
      if (normalizedSummaryStatus === "completed") return "Accepted";
      if (normalizedSummaryStatus === "pending") return "Onhold";
      return summaryStatus;
    }

    const sections = entry.sections || {};
    const approvalDecision = String(sections?.approvalDecision?.decision || "")
      .trim()
      .toLowerCase();

    if (approvalDecision === "approve report") return "Accepted";
    if (approvalDecision === "reject report with feedback") return "Rejected";

    const sectionStatuses = Object.values(sections)
      .map((section) => String(section?.status || "").trim())
      .filter(Boolean);

    if (!sectionStatuses.length) return "Yet to start";
    if (sectionStatuses.every((status) => String(status).toLowerCase() === "accepted")) {
      return "Accepted";
    }
    if (sectionStatuses.every((status) => String(status).toLowerCase() === "completed")) {
      return "Accepted";
    }
    if (sectionStatuses.includes("Ongoing")) return "Ongoing";
    if (sectionStatuses.includes("Onhold") || sectionStatuses.includes("OnHold")) return "Onhold";
    if (sectionStatuses.includes("Pending")) return "Onhold";
    if (sectionStatuses.includes("Accepted")) return "Accepted";
    if (sectionStatuses.includes("Completed")) return "Accepted";

    return sectionStatuses[0] || "Yet to start";
  };

  const getReviewerStatus = (project, column) => {
    const reviewerId = String(project?.[column.idKey] || "").trim();
    if (!reviewerId) {
      return { label: "Unassigned", tone: "idle" };
    }

    const checklistEntry =
      latestChecklistByProjectReviewer.get(`${project.id}|${reviewerId}`) ||
      latestChecklistByProjectReviewer.get(`${project.projectId || ""}|${reviewerId}`) ||
      null;

    const label = getChecklistProgressStatus(checklistEntry);
    const normalized = label.toLowerCase();

    if (normalized === "accepted" || normalized === "approved" || normalized === "completed") {
      return { label, tone: "success" };
    }
    if (normalized === "rejected") {
      return { label, tone: "danger" };
    }
    if (normalized === "ongoing" || normalized === "in progress") {
      return { label, tone: "active" };
    }
    if (normalized === "onhold" || normalized === "pending") {
      return { label, tone: "warning" };
    }

    return { label, tone: "idle" };
  };

  const getSelfReviewerStatus = (project) => {
    const matchedColumn = reviewerColumns.find(
      (column) => String(project?.[column.idKey] || "").trim() === String(user?.uid || "").trim(),
    );

    if (!matchedColumn) {
      return { label: "Unassigned", tone: "idle" };
    }

    return getReviewerStatus(project, matchedColumn);
  };

  const getAssignedReviewerDecisionSummary = (project) => {
    const assignedReviewers = reviewerColumns
      .map((column) => {
        const reviewerId = String(project?.[column.idKey] || "").trim();
        if (!reviewerId) return null;

        return {
          reviewerId,
          reviewerName:
            String(project?.[column.nameKey] || "").trim() || column.label,
          label: getReviewerStatus(project, column).label,
        };
      })
      .filter(Boolean);

    const normalizedStatuses = assignedReviewers.map((reviewer) =>
      String(reviewer.label || "").trim().toLowerCase(),
    );

    const pendingStatuses = ["yet to start", "ongoing", "onhold", "pending", "unassigned"];
    const acceptedStatuses = ["accepted", "approved", "completed"];

    return {
      assignedReviewers,
      hasAssignedReviewers: assignedReviewers.length > 0,
      hasPendingReviewers: normalizedStatuses.some((status) => pendingStatuses.includes(status)),
      hasRejectedReviewer: normalizedStatuses.includes("rejected"),
      allAccepted:
        assignedReviewers.length > 0 &&
        normalizedStatuses.every((status) => acceptedStatuses.includes(status)),
    };
  };

  const getDecisionGuard = (project, decision) => {
    const summary = getAssignedReviewerDecisionSummary(project);

    if (!summary.hasAssignedReviewers) {
      return {
        allowed: false,
        summary,
        reason: "No verification officers are assigned to this project yet.",
      };
    }

    if (decision === "Approved") {
      if (summary.hasRejectedReviewer) {
        return {
          allowed: false,
          summary,
          reason: "Approval is blocked because at least one verification officer rejected the report.",
        };
      }

      if (summary.hasPendingReviewers) {
        return {
          allowed: false,
          summary,
          reason: "Approval is blocked until every assigned verification officer completes review.",
        };
      }

      if (!summary.allAccepted) {
        return {
          allowed: false,
          summary,
          reason: "Approval requires all assigned verification officers to accept the report.",
        };
      }
    }

    if (decision === "Rejected" && summary.hasPendingReviewers && !summary.hasRejectedReviewer) {
      return {
        allowed: false,
        summary,
        reason: "Rejection is blocked until a verification officer rejects the report or all assigned reviews are completed.",
      };
    }

    return { allowed: true, summary, reason: "" };
  };

  const formatReviewerConfirmationSummary = (summary) =>
    summary.assignedReviewers
      .map((reviewer) => `${reviewer.reviewerName}: ${reviewer.label}`)
      .join(" | ");

  const shouldShowValidateReport = (project) => {
    const normalizedStatus = String(project?.status || "").trim().toLowerCase();
    if (normalizedStatus === "report accepted" || normalizedStatus === "report rejected") {
      return false;
    }
    return getSelfReviewerStatus(project).label !== "Accepted";
  };

  const getReviewerChecklistDetails = (project, column) => {
    const reviewerId = String(project?.[column.idKey] || "").trim();
    const reviewerName = String(project?.[column.nameKey] || "").trim();
    if (!reviewerId) {
      return {
        reviewerName: reviewerName || "Unassigned",
        status: "Unassigned",
        timestamp: null,
        observations: [],
      };
    }

    const checklistEntry =
      latestChecklistByProjectReviewer.get(`${project.id}|${reviewerId}`) ||
      latestChecklistByProjectReviewer.get(`${project.projectId || ""}|${reviewerId}`) ||
      null;

    const sections = checklistEntry?.sections || {};
    const summaryObservation = String(checklistEntry?.summary?.observation || "").trim();
    const observations = Object.entries(sections)
      .map(([sectionKey, sectionValue]) => ({
        sectionTitle:
          CHECKLIST_SECTION_TITLES[sectionKey] ||
          sectionKey.replace(/([A-Z])/g, " $1").trim(),
        observation: String(sectionValue?.observation || "").trim(),
      }))
      .filter((item) => item.observation);

    if (summaryObservation) {
      observations.unshift({
        sectionTitle: "Consolidated Review Summary",
        observation: summaryObservation,
      });
    }

    return {
      reviewerName: reviewerName || checklistEntry?.externalReviewerName || "Assigned Reviewer",
      status: getChecklistProgressStatus(checklistEntry),
      timestamp: checklistEntry?.updatedAt || checklistEntry?.createdAt || null,
      observations,
    };
  };

  const getReviewStartTimestamp = (project, detail) =>
    detail?.timestamp ||
    project?.clientReviewStartedAt ||
    project?.updatedAt ||
    project?.approvedAt ||
    project?.confirmedAt ||
    project?.deploymentDate ||
    project?.createdAt ||
    null;

  const getReviewCountdown = (project, detail) => {
    if (detail?.status === "Unassigned") {
      return { label: "No deadline", tone: "idle" };
    }

    const startTimestamp = toMillis(getReviewStartTimestamp(project, detail));
    if (!startTimestamp) {
      return { label: "Deadline unavailable", tone: "idle" };
    }

    const deadlineTimestamp = startTimestamp + 14 * 24 * 60 * 60 * 1000;
    const timeLeft = deadlineTimestamp - Date.now();

    if (timeLeft <= 0) {
      return { label: "Deadline elapsed", tone: "danger" };
    }

    const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
    const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (daysLeft <= 2) {
      return {
        label: `${daysLeft}d ${hoursLeft}h left`,
        tone: "danger",
      };
    }

    if (daysLeft <= 5) {
      return {
        label: `${daysLeft}d ${hoursLeft}h left`,
        tone: "warning",
      };
    }

    return {
      label: `${daysLeft}d ${hoursLeft}h left`,
      tone: "active",
    };
  };

  const getReviewStartedAt = (project) =>
    project?.clientReviewStartedAt ||
    project?.reviewStartedAt ||
    project?.updatedAt ||
    project?.approvedAt ||
    project?.confirmedAt ||
    project?.deploymentDate ||
    project?.createdAt ||
    null;

  const getLastReviewerUpdateAt = (project) => {
    let latestTimestamp = 0;

    reviewerColumns.forEach((column) => {
      const reviewerId = String(project?.[column.idKey] || "").trim();
      if (!reviewerId) return;

      const checklistEntry =
        latestChecklistByProjectReviewer.get(`${project.id}|${reviewerId}`) ||
        latestChecklistByProjectReviewer.get(`${project.projectId || ""}|${reviewerId}`) ||
        null;

      latestTimestamp = Math.max(latestTimestamp, getChecklistEntryTimestamp(checklistEntry));
    });

    return latestTimestamp || null;
  };

  const getDecisionTime = (project) => {
    const leadReviewerId = String(project?.externalReviewerId || "").trim();
    if (!leadReviewerId) {
      return project?.reportAcceptedAt || project?.reportRejectedAt || null;
    }

    const leadChecklistEntry =
      latestChecklistByProjectReviewer.get(`${project.id}|${leadReviewerId}`) ||
      latestChecklistByProjectReviewer.get(`${project.projectId || ""}|${leadReviewerId}`) ||
      null;

    const decision = String(leadChecklistEntry?.sections?.approvalDecision?.decision || "")
      .trim()
      .toLowerCase();

    if (decision === "approve report" || decision === "reject report with feedback") {
      return leadChecklistEntry?.updatedAt || leadChecklistEntry?.createdAt || null;
    }

    return project?.reportAcceptedAt || project?.reportRejectedAt || null;
  };

  const openFeedbackModal = async (project) => {
    if (!project?.id) {
      toast.error("Project reference is missing.");
      return;
    }

    try {
      await updateDoc(doc(db, "projects", project.id), {
        status: "Client Review In Progress",
        clientReviewStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to start client review."));
      return;
    }

    navigate("/external-reviewer-checklist", {
      state: { selectedProjectId: project.id },
    });
  };

  const closeFeedbackModal = () => {
    if (isSubmittingFeedback) return;
    setFeedbackProject(null);
    setFeedbackDecision("");
    setFeedbackMessage("");
  };

  const closeRemarkModal = () => {
    if (isSubmittingRemarkDecision) return;
    setRemarkProject(null);
  };

  const openRejectFeedbackFromRemark = () => {
    if (!remarkProject) {
      toast.error("Project reference is missing.");
      return;
    }

    setFeedbackProject(remarkProject);
    setFeedbackDecision("Rejected");
    setFeedbackMessage("");
    setRemarkProject(null);
  };

  const handleRemarkDecision = async (decisionStatus) => {
    if (!remarkProject?.id) {
      toast.error("Project reference is missing.");
      return;
    }

    if (!user?.uid) {
      toast.error("You must be signed in to take this action.");
      return;
    }

    setIsSubmittingRemarkDecision(true);
    try {
      const isAccepted = decisionStatus === "Report Accepted";
      await updateDoc(doc(db, "projects", remarkProject.id), {
        status: decisionStatus,
        updatedAt: serverTimestamp(),
        clientReviewDecisionAt: serverTimestamp(),
        clientReviewDecisionBy: user.fullName || user.name || user.displayName || user.email || "External Reviewer",
        clientReviewDecisionById: user.uid,
        reportAcceptedAt: isAccepted ? serverTimestamp() : null,
        reportAcceptedBy: isAccepted
          ? user.fullName || user.name || user.displayName || user.email || "External Reviewer"
          : null,
        reportRejectedAt: isAccepted ? null : serverTimestamp(),
        reportRejectedBy: isAccepted
          ? null
          : user.fullName || user.name || user.displayName || user.email || "External Reviewer",
      });

      toast.success(
        isAccepted ? "Project marked as Report Accepted." : "Project marked as Report Rejected.",
      );
      closeRemarkModal();
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the project decision."));
    } finally {
      setIsSubmittingRemarkDecision(false);
    }
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

    const decisionGuard = getDecisionGuard(feedbackProject, feedbackDecision);
    if (!decisionGuard.allowed) {
      toast.error(decisionGuard.reason);
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

    const confirmationMessage = [
      `Project: ${feedbackProject.projectName || feedbackProject.projectId || feedbackProject.id}`,
      `Decision: ${feedbackDecision === "Approved" ? "Report Accepted" : "Report Rejected"}`,
      `Reviewers: ${formatReviewerConfirmationSummary(decisionGuard.summary)}`,
      feedbackDecision === "Approved"
        ? "This will finalize the report as accepted for the current external review cycle."
        : "This will reject the report and send corrective feedback back into the workflow.",
    ].join(" ");

    const confirmed = await openConfirm({
      title: feedbackDecision === "Approved" ? "Confirm Report Approval" : "Confirm Report Rejection",
      message: confirmationMessage,
      confirmLabel: feedbackDecision === "Approved" ? "Confirm Approval" : "Confirm Rejection",
      cancelLabel: "Cancel",
      tone: feedbackDecision === "Approved" ? "success" : "warning",
    });

    if (!confirmed) {
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

      await updateDoc(doc(db, "projects", feedbackProject.id), {
        status: feedbackDecision === "Approved" ? "Report Accepted" : "Report Rejected",
        updatedAt: serverTimestamp(),
        clientReviewDecisionAt: serverTimestamp(),
        clientReviewDecisionBy:
          user.fullName || user.name || user.displayName || user.email || "External Reviewer",
        clientReviewDecisionById: user.uid,
        reportAcceptedAt: feedbackDecision === "Approved" ? serverTimestamp() : null,
        reportAcceptedBy:
          feedbackDecision === "Approved"
            ? user.fullName || user.name || user.displayName || user.email || "External Reviewer"
            : null,
        reportRejectedAt: feedbackDecision === "Rejected" ? serverTimestamp() : null,
        reportRejectedBy:
          feedbackDecision === "Rejected"
            ? user.fullName || user.name || user.displayName || user.email || "External Reviewer"
            : null,
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

  const handleViewReport = async (projectId) => {
    if (!projectId) {
      toast.error("Project reference is missing.");
      return;
    }

    navigate(`/admin/project/${projectId}`);
  };

  return (
    <>
    {ConfirmDialog}
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
              key: "project",
              label: "Project Filter",
              value: projectFilter,
              onChange: setProjectFilter,
              options: [
                { value: "all", label: "All Projects" },
                ...Array.from(
                  new Set(
                    projects
                      .map((project) => project.projectName || project.projectId || project.id)
                      .filter(Boolean),
                  ),
                ).map((projectLabel) => ({
                  value: String(projectLabel).toLowerCase(),
                  label: projectLabel,
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
        <table className="w-full min-w-[1600px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0b1326]">
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">S/N</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Identity</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Client & Industry</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Facility Location</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Inspection Start Date</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Inspection End Date</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Review Started At</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Last Reviewer Update</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Decision Time</th>
                        {visibleReviewerColumns.map((column) => (
                          <th
                            key={column.idKey}
                            className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]"
                          >
                            {column.label}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-3 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {groupedProjects.map((group) => (
                        <React.Fragment key={group.key}>
                          {groupBy !== TABLE_GROUP_NONE ? (
                            <tr className="bg-[#08101f]">
                              <td
                                colSpan={11 + visibleReviewerColumns.length}
                                className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                              >
                                {group.label} ({group.items.length})
                              </td>
                            </tr>
                          ) : null}
                      {group.items.map((project, index) => {
                        const operationalStatus = getOperationalStatus(project);
                        const isReportAccepted =
                          String(project?.status || "").trim().toLowerCase() === "report accepted";
                        const isReportRejected =
                          String(project?.status || "").trim().toLowerCase() === "report rejected";
                        const projectStartDate = getProjectStartDate(project);
                        const projectEndDate = getProjectEndDate(project);
                        const reviewStartedAt = getReviewStartedAt(project);
                        const lastReviewerUpdateAt = getLastReviewerUpdateAt(project);
                        const decisionTime = getDecisionTime(project);
                        const selfReviewerStatus = getSelfReviewerStatus(project);
                        const statusBadgeTheme = getOperationalStatusBadgeTheme(
                          operationalStatus,
                        );
                        return (
                        <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-3 py-4 text-xs font-bold text-slate-400">
                            {index + 1}
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
                            <div className="text-xs font-medium text-slate-300">
                              {formatDateTime(reviewStartedAt)}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {formatDateTime(lastReviewerUpdateAt)}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {formatDateTime(decisionTime)}
                            </div>
                          </td>
                          {visibleReviewerColumns.map((column) => {
                            const reviewerStatus =
                              column.idKey === "__self__"
                                ? getSelfReviewerStatus(project)
                                : getReviewerStatus(project, column);
                            return (
                              <td key={column.idKey} className="px-3 py-4">
                                <div
                                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                                    reviewerStatus.tone === "success"
                                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                      : reviewerStatus.tone === "danger"
                                        ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                        : reviewerStatus.tone === "active"
                                          ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                                          : reviewerStatus.tone === "warning"
                                            ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                            : "border-slate-700 bg-slate-900/60 text-slate-400"
                                  }`}
                                >
                                  {reviewerStatus.label}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-3 py-4">
                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${statusBadgeTheme.wrapper}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusBadgeTheme.dot}`}></span>
                              {operationalStatus}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 ">
                              <button 
                                onClick={() => handleViewReport(project.id)}
                                className="ml-2 p-2 text-[10px] bg-orange-600 border border-orange-500/20 text-white hover:bg-orange-700 transition-all rounded-xl shadow-lg shadow-orange-900/20"
                                title="View Report"
                              >
                                View Report
                              </button>
                             {!isReportAccepted && !isReportRejected && shouldShowValidateReport(project) ? (
                                <button 
                                  onClick={() => openFeedbackModal(project)}
                                  className="ml-2 p-2 text-[10px] bg-orange-600 border border-orange-500/20 text-white hover:bg-orange-700 transition-all rounded-xl shadow-lg shadow-orange-900/20"
                                  title="Validate Report"
                                >
                                  Validate Report 
                                </button>
                              ) : null}
                              
                              
                              {isVerificationLeadOfficer && !isReportAccepted ? (
                                <button 
                                  onClick={() => setRemarkProject(project)}
                                  className="ml-2 p-2 text-[10px] bg-slate-900 border border-slate-700 text-slate-200 hover:border-orange-500/40 hover:text-white transition-all rounded-xl"
                                  title="Accept/Reject"
                                >
                                  Accept/Reject
                                </button>
                              ) : null}
                             
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

    {remarkProject ? (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
        <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#08101f] shadow-[0_28px_80px_rgba(2,6,23,0.7)]">
          <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
                Project Remark
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                {remarkProject.projectName || remarkProject.projectId || "Unnamed Project"}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeRemarkModal}
              className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-400 transition-colors hover:text-white"
              aria-label="Close remark modal"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-6">
            <div className="space-y-4">
             {/* <div className="rounded-2xl border border-slate-800 bg-[#060b17] p-4 text-sm leading-7 text-slate-300 whitespace-pre-wrap">
                {getProjectRemark(remarkProject) || "No remark available for this project yet."}
              </div>*/}

              <div className="grid gap-4">
                {reviewerColumns.map((column) => {
                  const detail = getReviewerChecklistDetails(remarkProject, column);
                  const countdown = getReviewCountdown(remarkProject, detail);
                  return (
                    <div
                      key={column.idKey}
                      className="rounded-2xl border border-slate-800 bg-[#060b17] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
                            {column.label}
                          </p>
                          <h3 className="mt-2 text-sm font-bold text-white">
                            {detail.reviewerName}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                          <span
                            className={`rounded-full border px-3 py-1 ${
                              String(detail.status || "").toLowerCase() === "rejected"
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                : String(detail.status || "").toLowerCase() === "accepted"
                                  ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                                  : "border-slate-700 bg-slate-900/60 text-slate-300"
                            }`}
                          >
                            {detail.status}
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-slate-400">
                            {formatDateTime(detail.timestamp)}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 ${
                              countdown.tone === "danger"
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                : countdown.tone === "warning"
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                  : countdown.tone === "active"
                                    ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                                    : "border-slate-700 bg-slate-900/60 text-slate-400"
                            }`}
                          >
                            {countdown.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {detail.observations.length ? (
                          detail.observations.map((item) => (
                            <div
                              key={`${column.idKey}-${item.sectionTitle}`}
                              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                            >
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                {item.sectionTitle}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                {item.observation}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-500">
                            No observations saved yet.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-800 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={openRejectFeedbackFromRemark}
              disabled={isSubmittingRemarkDecision}
              className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingRemarkDecision ? "Processing..." : "Reject With Feedback"}
            </button>
            <button
              type="button"
              onClick={() => handleRemarkDecision("Report Accepted")}
              disabled={isSubmittingRemarkDecision}
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingRemarkDecision ? "Processing..." : "Accept"}
            </button>
            <button
              type="button"
              onClick={closeRemarkModal}
              disabled={isSubmittingRemarkDecision}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-300 transition-colors hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    ) : null}

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

            {(() => {
              const decisionGuard = getDecisionGuard(
                feedbackProject,
                feedbackDecision || "Approved",
              );
              const shouldShowGuard = Boolean(feedbackDecision);

              if (!shouldShowGuard) return null;

              return (
                <div
                  className={`rounded-2xl border p-4 ${
                    decisionGuard.allowed
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-amber-500/30 bg-amber-500/10"
                  }`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.22em] ${
                      decisionGuard.allowed ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    Reviewer Confirmation Check
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {decisionGuard.summary.assignedReviewers.map((reviewer) => (
                      <span
                        key={reviewer.reviewerId}
                        className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-200"
                      >
                        {reviewer.reviewerName}: {reviewer.label}
                      </span>
                    ))}
                  </div>
                  <p
                    className={`mt-3 text-xs ${
                      decisionGuard.allowed ? "text-emerald-100" : "text-amber-100"
                    }`}
                  >
                    {decisionGuard.allowed
                      ? "All required verification officer conditions are satisfied. A final confirmation prompt will appear before submission."
                      : decisionGuard.reason}
                  </p>
                </div>
              );
            })()}

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
              onClick={() => handleViewReport(feedbackProject.id)}
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
