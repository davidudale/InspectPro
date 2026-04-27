import React, { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import {
  Activity,
  BarChart3,
  Clock3,
  FileSearch,
  PieChart as PieChartIcon,
  ShieldCheck,
} from "lucide-react";
import html2pdf from "html2pdf.js";
import { collection, collectionGroup, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import { matchesExternalReviewerProject } from "../../../utils/externalReviewerAccess";
import { distinctRowsByLatest } from "../../../utils/distinctRows";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import InspectorNavbar from "../InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../InspectorsFile/InspectorSidebar";
import SupervisorNavbar from "../SupervisorFiles/SupervisorNavbar";
import SupervisorSidebar from "../SupervisorFiles/SupervisorSidebar";
import ExternalNavbar from "../ExternalDashboard/ExternalNavbar";
import ExternalSideBar from "../ExternalDashboard/ExternalSideBar";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const NULL_LIKE_TEXT = new Set(["null", "undefined", "n/a", "na", "none", "-"]);

const isNullLikeText = (value) =>
  typeof value === "string" && NULL_LIKE_TEXT.has(value.trim().toLowerCase());

const toMillis = (value) => {
  if (!value) return 0;
  if (isNullLikeText(value)) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  return 0;
};

const formatDateTime = (value) => {
  const millis = toMillis(value);
  if (!millis) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
};

const hasValue = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  return !NULL_LIKE_TEXT.has(normalized.toLowerCase());
};

const pickFirstValue = (...values) => values.find((value) => hasValue(value));

const asText = (value) => {
  const resolved = pickFirstValue(value);
  return hasValue(resolved) ? String(resolved).trim() : "N/A";
};

const normalizeReviewerType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const getReviewEntryStatus = (entry) => {
  const summaryStatus = String(entry?.summary?.status || "").trim();
  if (summaryStatus) return summaryStatus;

  const decision = String(entry?.sections?.approvalDecision?.decision || "")
    .trim()
    .toLowerCase();
  if (decision.includes("approve")) return "Accepted";
  if (decision.includes("reject")) return "Rejected";

  const sectionStatuses = Object.values(entry?.sections || {})
    .map((section) => String(section?.status || "").trim())
    .filter(Boolean);

  if (!sectionStatuses.length) return "";
  if (sectionStatuses.every((status) => String(status).toLowerCase() === "accepted")) return "Accepted";
  if (sectionStatuses.every((status) => String(status).toLowerCase() === "completed")) return "Accepted";
  if (sectionStatuses.some((status) => String(status).toLowerCase() === "rejected")) return "Rejected";
  return sectionStatuses[0];
};

const formatCountdown = (explicitValue, targetDate) => {
  if (hasValue(explicitValue)) return String(explicitValue).trim();
  const targetMillis = toMillis(targetDate);
  if (!targetMillis) return "N/A";

  const delta = targetMillis - Date.now();
  const absDelta = Math.abs(delta);
  const days = Math.floor(absDelta / 86400000);
  const hours = Math.floor((absDelta % 86400000) / 3600000);

  if (delta >= 0) return `${days}d ${hours}h remaining`;
  return `${days}d ${hours}h overdue`;
};

const formatReviewDuration = (startValue, endValue) => {
  const startMs = toMillis(startValue);
  const endMs = toMillis(endValue);
  if (!startMs || !endMs || endMs < startMs) return "N/A";

  const totalMinutes = Math.floor((endMs - startMs) / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const normalizeProjectStatus = (project) => {
  const rawStatus = String(project?.status || project?.report?.status || "")
    .trim()
    .toLowerCase();

  if (!rawStatus) return "Planned";
  if (rawStatus === "report accepted") return "Accepted";
  if (rawStatus === "approved") return "Approved";
  if (rawStatus === "report rejected") return "Rejected";
  if (rawStatus.includes("client review")) return "Client Review";
  if (rawStatus.startsWith("passed and forwarded") || rawStatus.startsWith("pending confirmation")) {
    return "Approval Queue";
  }
  if (rawStatus.includes("returned") || rawStatus.includes("correction")) return "Returned";
  if (rawStatus.startsWith("in progress")) return "In Progress";
  if (rawStatus.startsWith("not started")) return "Not Started";
  return "Other";
};

const getOperationalStatusText = (project) => {
  const topLevelStatus = String(project?.status || "").trim();
  const reportStatus = String(project?.report?.status || "").trim();
  const topLower = topLevelStatus.toLowerCase();
  const reportLower = reportStatus.toLowerCase();

  if (topLevelStatus) return topLevelStatus;
  if (reportStatus && !["draft", "new"].includes(reportLower)) return reportStatus;

  if (project?.inspectionStartedAt && (topLower.startsWith("not started") || !topLevelStatus)) {
    return `In Progress - ${project?.inspectorName || "Inspector"}`;
  }

  return "Planned";
};

const getProjectEndDate = (project) =>
  project?.inspectionEndDate ||
  project?.approvedAt ||
  project?.confirmedAt ||
  project?.confirmationDate ||
  project?.updatedAt ||
  project?.lastUpdated ||
  null;

const getProjectStartDate = (project) =>
  project?.startDate ||
  project?.deploymentDate ||
  project?.inspectionStartedAt ||
  project?.createdAt ||
  project?.timestamp ||
  null;

const getDecisionAt = (project, latestExternalDecision) => {
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

  const normalizedStatus = String(getOperationalStatusText(project) || "").trim().toLowerCase();

  if (normalizedStatus === "report accepted" || normalizedStatus === "reported accepted") {
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

  if (normalizedStatus === "report rejected" || normalizedStatus === "reported rejected") {
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
};

const getDecisionBy = (project, latestExternalDecision) => {
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

  const normalizedStatus = String(getOperationalStatusText(project) || "").trim().toLowerCase();

  if (normalizedStatus === "report accepted" || normalizedStatus === "reported accepted") {
    return (
      project?.reportAcceptedBy ||
      project?.acceptedBy ||
      project?.approvedBy ||
      project?.confirmedBy ||
      "N/A"
    );
  }

  if (normalizedStatus === "report rejected" || normalizedStatus === "reported rejected") {
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
};

const normalizeAuditTone = (type) => {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized === "alert") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (normalized === "success") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border-sky-500/30 bg-sky-500/10 text-sky-200";
};

const resolveShell = (role) => {
  if (role === "Admin") {
    return { navbar: <AdminNavbar />, sidebar: <AdminSidebar /> };
  }
  if (role === "Manager") {
    return { navbar: <ManagerNavbar />, sidebar: <ManagerSidebar /> };
  }
  if (role === "Lead Inspector") {
    return { navbar: <SupervisorNavbar />, sidebar: <SupervisorSidebar /> };
  }
  if (role === "External_Reviewer" || role === "External Reviewer") {
    return { navbar: <ExternalNavbar />, sidebar: <ExternalSideBar /> };
  }
  return { navbar: <InspectorNavbar />, sidebar: <InspectorSidebar /> };
};

const Inspection360Summary = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [reviewEntries, setReviewEntries] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("all");
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [activeAuditRow, setActiveAuditRow] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      setProjects(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "external_feedback"), (snapshot) => {
      setFeedbackEntries(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collectionGroup(db, "reviewers"), (snapshot) => {
      setReviewEntries(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const logsQuery = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(200));
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      setActivityLogs(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  const scopedProjects = useMemo(() => {
    const uid = String(user?.uid || "").trim();
    const role = user?.role;

    return projects.filter((project) => {
      if (role === "Admin" || role === "Manager") return true;
      if (role === "Lead Inspector") return String(project?.supervisorId || "").trim() === uid;
      if (role === "Inspector") return String(project?.inspectorId || "").trim() === uid;
      if (role === "External_Reviewer" || role === "External Reviewer") {
        return matchesExternalReviewerProject(project, user);
      }
      return false;
    });
  }, [projects, user]);

  const projectFilterOptions = useMemo(
    () =>
      [...scopedProjects]
        .sort((left, right) => {
          const leftLabel = String(left.projectName || left.projectId || left.id || "").toLowerCase();
          const rightLabel = String(right.projectName || right.projectId || right.id || "").toLowerCase();
          return leftLabel.localeCompare(rightLabel);
        })
        .map((project) => ({
          value: project.id,
          label: project.projectName || project.projectId || project.id,
          hint: project.projectId && project.projectName ? project.projectId : "",
        })),
    [scopedProjects],
  );

  useEffect(() => {
    if (projectFilter === "all") return;
    const exists = scopedProjects.some((project) => project.id === projectFilter);
    if (!exists) {
      setProjectFilter("all");
    }
  }, [projectFilter, scopedProjects]);

  const filteredProjects = useMemo(() => {
    const rows =
      projectFilter === "all"
        ? scopedProjects
        : scopedProjects.filter((project) => project.id === projectFilter);
    return distinctRowsByLatest(
      rows,
      (project) => project.id || project.projectId,
      (project) => Math.max(toMillis(project?.updatedAt), toMillis(project?.createdAt), toMillis(project?.timestamp)),
    );
  }, [scopedProjects, projectFilter]);

  const filteredProjectKeys = useMemo(
    () =>
      new Set(
        filteredProjects.flatMap((project) =>
          [String(project.id || "").trim(), String(project.projectId || "").trim()].filter(Boolean),
        ),
      ),
    [filteredProjects],
  );

  const scopedFeedback = useMemo(
    () =>
      feedbackEntries.filter((entry) =>
        filteredProjectKeys.has(String(entry.projectDocId || "").trim()) ||
        filteredProjectKeys.has(String(entry.projectId || "").trim()),
      ),
    [feedbackEntries, filteredProjectKeys],
  );

  const usersById = useMemo(
    () =>
      new Map(users.map((entry) => [String(entry.id || entry.uid || "").trim(), entry]).filter(([key]) => key)),
    [users],
  );

  const usersByEmail = useMemo(
    () =>
      new Map(
        users
          .map((entry) => [String(entry.email || "").trim().toLowerCase(), entry])
          .filter(([key]) => key),
      ),
    [users],
  );

  const latestFeedbackByProjectKey = useMemo(() => {
    const output = new Map();
    [...scopedFeedback]
      .sort((left, right) => toMillis(right.createdAt || right.updatedAt) - toMillis(left.createdAt || left.updatedAt))
      .forEach((entry) => {
        const projectDocId = String(entry.projectDocId || "").trim();
        const projectId = String(entry.projectId || "").trim();
        if (projectDocId && !output.has(projectDocId)) output.set(projectDocId, entry);
        if (projectId && !output.has(projectId)) output.set(projectId, entry);
      });
    return output;
  }, [scopedFeedback]);

  const latestExternalDecisionByProjectKey = useMemo(() => {
    const output = new Map();
    scopedFeedback.forEach((entry) => {
      const decision = String(entry?.decision || "").trim().toLowerCase();
      if (!["approved", "rejected"].includes(decision)) return;

      const entryTimestamp = Math.max(
        toMillis(entry?.createdAt),
        toMillis(entry?.updatedAt),
        toMillis(entry?.adminUpdatedAt),
      );
      const keys = [String(entry?.projectDocId || "").trim(), String(entry?.projectId || "").trim()].filter(Boolean);

      keys.forEach((key) => {
        const existing = output.get(key);
        const existingTimestamp = existing
          ? Math.max(
              toMillis(existing?.createdAt),
              toMillis(existing?.updatedAt),
              toMillis(existing?.adminUpdatedAt),
            )
          : 0;
        if (!existing || entryTimestamp >= existingTimestamp) {
          output.set(key, entry);
        }
      });
    });
    return output;
  }, [scopedFeedback]);

  const feedbackTimelineByProjectReviewer = useMemo(() => {
    const output = new Map();
    scopedFeedback.forEach((entry) => {
      const keys = [
        String(entry?.projectDocId || "").trim(),
        String(entry?.projectId || "").trim(),
      ].filter(Boolean);
      const reviewerKeys = [
        String(entry?.id || "").trim().toLowerCase(),
        String(entry?.externalReviewerId || "").trim().toLowerCase(),
        String(entry?.externalReviewerEmail || "").trim().toLowerCase(),
        String(entry?.externalReviewerName || "").trim().toLowerCase(),
      ].filter(Boolean);
      const timestamp = Math.max(
        toMillis(entry?.createdAt),
        toMillis(entry?.updatedAt),
        toMillis(entry?.adminUpdatedAt),
      );
      if (!timestamp || !keys.length || !reviewerKeys.length) return;

      keys.forEach((projectKey) => {
        reviewerKeys.forEach((reviewerKey) => {
          const mapKey = `${projectKey}::${reviewerKey}`;
          const existing = output.get(mapKey);
          if (!existing) {
            output.set(mapKey, { firstAt: timestamp, lastAt: timestamp });
            return;
          }
          output.set(mapKey, {
            firstAt: Math.min(existing.firstAt, timestamp),
            lastAt: Math.max(existing.lastAt, timestamp),
          });
        });
      });
    });
    return output;
  }, [scopedFeedback]);

  const reviewTimelineByProjectReviewer = useMemo(() => {
    const output = new Map();
    reviewEntries.forEach((entry) => {
      const keys = [
        String(entry?.projectDocId || "").trim(),
        String(entry?.projectId || "").trim(),
      ].filter(Boolean);
      const reviewerKeys = [
        String(entry?.id || "").trim().toLowerCase(),
        String(entry?.externalReviewerId || "").trim().toLowerCase(),
        String(entry?.externalReviewerEmail || "").trim().toLowerCase(),
        String(entry?.externalReviewerName || "").trim().toLowerCase(),
      ].filter(Boolean);
      const timestamp = Math.max(toMillis(entry?.updatedAt), toMillis(entry?.createdAt));
      const status = getReviewEntryStatus(entry);
      if (!timestamp || !keys.length || !reviewerKeys.length) return;

      keys.forEach((projectKey) => {
        reviewerKeys.forEach((reviewerKey) => {
          const mapKey = `${projectKey}::${reviewerKey}`;
          const existing = output.get(mapKey);
          if (!existing) {
            output.set(mapKey, { firstAt: timestamp, lastAt: timestamp, latestStatus: status });
            return;
          }
          output.set(mapKey, {
            firstAt: Math.min(existing.firstAt, timestamp),
            lastAt: Math.max(existing.lastAt, timestamp),
            latestStatus: timestamp >= existing.lastAt ? status || existing.latestStatus : existing.latestStatus,
          });
        });
      });
    });
    return output;
  }, [reviewEntries]);

  const reviewTimelineByProjectRole = useMemo(() => {
    const output = new Map();
    reviewEntries.forEach((entry) => {
      const keys = [String(entry?.projectDocId || "").trim(), String(entry?.projectId || "").trim()].filter(Boolean);
      const roleKey = normalizeReviewerType(entry?.reviewerType);
      const timestamp = Math.max(toMillis(entry?.updatedAt), toMillis(entry?.createdAt));
      if (!timestamp || !keys.length || !roleKey) return;
      const status = getReviewEntryStatus(entry);

      keys.forEach((projectKey) => {
        const mapKey = `${projectKey}::${roleKey}`;
        const existing = output.get(mapKey);
        if (!existing) {
          output.set(mapKey, { firstAt: timestamp, lastAt: timestamp, latestStatus: status });
          return;
        }
        output.set(mapKey, {
          firstAt: Math.min(existing.firstAt, timestamp),
          lastAt: Math.max(existing.lastAt, timestamp),
          latestStatus: timestamp >= existing.lastAt ? status || existing.latestStatus : existing.latestStatus,
        });
      });
    });
    return output;
  }, [reviewEntries]);

  const scopedLogs = useMemo(() => {
    const currentEmail = String(user?.email || "").trim().toLowerCase();
    return activityLogs.filter((entry) => {
      const target = String(entry.target || "").trim();
      const logEmail = String(entry.userEmail || "").trim().toLowerCase();
      if (projectFilter !== "all") {
        return filteredProjectKeys.has(target);
      }
      return filteredProjectKeys.has(target) || (!!currentEmail && logEmail === currentEmail) || user?.role === "Admin";
    });
  }, [activityLogs, filteredProjectKeys, projectFilter, user?.email, user?.role]);

  const statusSummary = useMemo(() => {
    const counts = filteredProjects.reduce((accumulator, project) => {
      const bucket = normalizeProjectStatus(project);
      accumulator[bucket] = (accumulator[bucket] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { label: "Approved", value: counts.Approved || 0 },
      { label: "Accepted", value: counts.Accepted || 0 },
      { label: "Rejected", value: counts.Rejected || 0 },
      { label: "Client Review", value: counts["Client Review"] || 0 },
      { label: "Approval Queue", value: counts["Approval Queue"] || 0 },
      { label: "In Progress", value: counts["In Progress"] || 0 },
      { label: "Returned", value: counts.Returned || 0 },
      { label: "Not Started", value: counts["Not Started"] || 0 },
      { label: "Other", value: counts.Other || 0 },
    ];
  }, [filteredProjects]);

  const decisionSummary = useMemo(() => {
    const counts = scopedFeedback.reduce(
      (accumulator, entry) => {
        const normalized = String(entry.decision || "").trim().toLowerCase();
        if (normalized === "approved") accumulator.approved += 1;
        else if (normalized === "rejected") accumulator.rejected += 1;
        else accumulator.pending += 1;
        return accumulator;
      },
      { approved: 0, rejected: 0, pending: 0 },
    );

    const projectsInClientReview = filteredProjects.filter(
      (project) => normalizeProjectStatus(project) === "Client Review",
    ).length;

    return {
      approved: counts.approved,
      rejected: counts.rejected,
      inReview: projectsInClientReview,
      pending: Math.max(filteredProjects.length - counts.approved - counts.rejected - projectsInClientReview, 0),
    };
  }, [scopedFeedback, filteredProjects]);

  const clientSummaryRows = useMemo(() => {
    const grouped = filteredProjects.reduce((accumulator, project) => {
      const key = String(project.clientName || project.client || "Unassigned Client").trim();
      const current = accumulator.get(key) || {
        client: key,
        totalProjects: 0,
        approved: 0,
        accepted: 0,
        rejected: 0,
        inProgress: 0,
        reviewQueue: 0,
      };

      const bucket = normalizeProjectStatus(project);
      current.totalProjects += 1;
      if (bucket === "Approved") current.approved += 1;
      if (bucket === "Accepted") current.accepted += 1;
      if (bucket === "Rejected") current.rejected += 1;
      if (bucket === "In Progress") current.inProgress += 1;
      if (bucket === "Approved" || bucket === "Client Review" || bucket === "Approval Queue") {
        current.reviewQueue += 1;
      }

      accumulator.set(key, current);
      return accumulator;
    }, new Map());

    return Array.from(grouped.values()).sort((left, right) => right.totalProjects - left.totalProjects);
  }, [filteredProjects]);

  const auditRows = useMemo(
    () =>
      [...filteredProjects]
        .sort((left, right) => {
          const leftValue = Math.max(
            toMillis(left.updatedAt),
            toMillis(left.reportAcceptedAt),
            toMillis(left.reportRejectedAt),
            toMillis(left.clientReviewDecisionAt),
            toMillis(left.clientReviewStartedAt),
            toMillis(left.createdAt),
            toMillis(left.timestamp),
          );
          const rightValue = Math.max(
            toMillis(right.updatedAt),
            toMillis(right.reportAcceptedAt),
            toMillis(right.reportRejectedAt),
            toMillis(right.clientReviewDecisionAt),
            toMillis(right.clientReviewStartedAt),
            toMillis(right.createdAt),
            toMillis(right.timestamp),
          );
          if (rightValue !== leftValue) return rightValue - leftValue;
          return String(right.projectId || right.id || "").localeCompare(
            String(left.projectId || left.id || ""),
          );
        })
        .slice(0, 20),
    [filteredProjects],
  );

  const filteredAuditRows = useMemo(() => {
    const term = String(auditSearchTerm || "").trim().toLowerCase();
    if (!term) return auditRows;

    return auditRows.filter((project) => {
      const searchableValues = [
        project?.projectId,
        project?.projectName,
        project?.id,
        project?.clientName,
        project?.client,
        project?.status,
        project?.finalStatus,
        project?.inspectorName,
        project?.assignedInspectorName,
        project?.supervisorName,
        project?.assignedSupervisorName,
        project?.approvedBy,
        project?.confirmedBy,
        project?.reportAcceptedBy,
        project?.verificationLeadName,
        project?.verificationLead,
        project?.externalReviewerName,
        project?.externalReviewerName2,
        project?.externalReviewerName3,
        project?.externalReviewerName4,
        project?.externalReviewerName5,
        project?.externalReviewerName6,
        project?.requiredTechnique,
        project?.selectedTechnique,
        project?.inspectionTypeName,
        project?.inspectionTypeCode,
        project?.equipmentTag,
        project?.tag,
        project?.equipmentCategory,
        project?.assetType,
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(term),
      );
    });
  }, [auditRows, auditSearchTerm]);

  const recentAuditTrail = useMemo(
    () =>
      [...scopedLogs]
        .sort((left, right) => toMillis(right.timestamp) - toMillis(left.timestamp))
        .slice(0, 25),
    [scopedLogs],
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#cbd5e1",
          font: { size: 11, weight: 700 },
        },
      },
      tooltip: {
        backgroundColor: "#020617",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8", font: { size: 11, weight: 700 } },
        grid: { color: "rgba(51,65,85,0.3)" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#94a3b8", font: { size: 11, weight: 700 } },
        grid: { color: "rgba(51,65,85,0.3)" },
      },
    },
  };

  const statusChartData = {
    labels: statusSummary.map((item) => item.label),
    datasets: [
      {
        label: "Projects",
        data: statusSummary.map((item) => item.value),
        backgroundColor: [
          "#22c55e",
          "#10b981",
          "#f43f5e",
          "#a855f7",
          "#38bdf8",
          "#f97316",
          "#ef4444",
          "#6366f1",
          "#64748b",
        ],
        borderRadius: 10,
        maxBarThickness: 38,
      },
    ],
  };

  const decisionChartData = {
    labels: ["Approved", "Rejected", "Client Review", "Pending"],
    datasets: [
      {
        data: [
          decisionSummary.approved,
          decisionSummary.rejected,
          decisionSummary.inReview,
          decisionSummary.pending,
        ],
        backgroundColor: ["#10b981", "#f43f5e", "#a855f7", "#38bdf8"],
        borderWidth: 0,
      },
    ],
  };

  const shell = resolveShell(user?.role);
  const reportAudienceLabel =
    user?.role === "External_Reviewer" || user?.role === "External Reviewer"
      ? "Client / NDE Advisor Workspace"
      : user?.role === "Admin"
        ? "Enterprise Admin Workspace"
        : "Operational Workspace";

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      {shell.navbar}
      <div className="flex flex-1">
        {shell.sidebar}
        <main className="flex-1 ml-16 min-w-0 overflow-x-hidden bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.10),_transparent_26%),linear-gradient(180deg,_#07101f_0%,_#050816_55%,_#040712_100%)] p-3 sm:p-5 lg:ml-64 lg:p-8">
          <div className="mx-auto max-w-[1500px] space-y-6">
            <section className="rounded-[2rem] border border-slate-800/80 bg-[#08101f]/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-400">
                    Report Manager
                  </p>
                  <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                    360° Inspection Summary
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                    A consolidated inspection intelligence view with lifecycle coverage, client review outcomes,
                    summary tables, and a full audit trail for {reportAudienceLabel.toLowerCase()}.
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4">
                  <label
                    htmlFor="inspection360-project-filter"
                    className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                  >
                    Project Filter
                  </label>
                  <select
                    id="inspection360-project-filter"
                    value={projectFilter}
                    onChange={(event) => setProjectFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-orange-500"
                  >
                    <option value="all">All Visible Projects</option>
                    {projectFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.hint ? `${option.label} (${option.hint})` : option.label}
                      </option>
                    ))}
                  </select>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Generated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">{formatDateTime(Date.now())}</p>
                  </div>
                </div>
              </div>
            </section>

            {loading ? (
              <div className="flex min-h-[340px] items-center justify-center rounded-[2rem] border border-slate-800 bg-[#08101f]/95">
                <Activity className="animate-spin text-orange-500" />
              </div>
            ) : (
              <>
              
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    icon={<ShieldCheck size={16} />}
                    label="Visible Projects"
                    value={String(filteredProjects.length)}
                    tone="orange"
                  />
                  <MetricCard
                    icon={<BarChart3 size={16} />}
                    label="Accepted Reports"
                    value={String(statusSummary.find((item) => item.label === "Accepted")?.value || 0)}
                    tone="emerald"
                  />
                  <MetricCard
                    icon={<PieChartIcon size={16} />}
                    label="Rejected Reports"
                    value={String(statusSummary.find((item) => item.label === "Rejected")?.value || 0)}
                    tone="rose"
                  />
                  <MetricCard
                    icon={<Clock3 size={16} />}
                    label="Audit Events"
                    value={String(recentAuditTrail.length)}
                    tone="sky"
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
                  <ChartCard
                    title="Inspection Lifecycle Distribution"
                    subtitle="Bar chart overview of the workflow stages across the visible inspection portfolio."
                    icon={<BarChart3 size={16} />}
                  >
                    <div className="h-[320px]">
                      <Bar data={statusChartData} options={chartOptions} />
                    </div>
                  </ChartCard>
                  <ChartCard
                    title="Client Review Outcome Split"
                    subtitle="Pie chart showing how accepted, rejected, in-review, and pending items are distributed."
                    icon={<PieChartIcon size={16} />}
                  >
                    <div className="h-[320px]">
                      <Pie
                        data={decisionChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: chartOptions.plugins,
                        }}
                      />
                    </div>
                  </ChartCard>
                </section>

                <section className="rounded-[2rem] border border-slate-800/80 bg-[#08101f]/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2 text-orange-400">
                      <FileSearch size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                        Summary Table
                      </p>
                      <h2 className="text-lg font-black text-white">Inspection Portfolio Summary by Client</h2>
                    </div>
                  </div>
                  <div className="overflow-auto rounded-[1.4rem] border border-slate-800 bg-slate-950/50">
                    <table className="min-w-full text-left">
                      <thead className="bg-[#091122] text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-4">Client</th>
                          <th className="px-4 py-4">Total Projects</th>
                          <th className="px-4 py-4">Approved</th>
                          <th className="px-4 py-4">Accepted</th>
                          <th className="px-4 py-4">Rejected</th>
                          <th className="px-4 py-4">In Progress</th>
                          <th className="px-4 py-4">Review Queue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {clientSummaryRows.length > 0 ? (
                          clientSummaryRows.map((row) => (
                            <tr key={row.client} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-4 text-sm font-semibold text-white">{row.client}</td>
                              <td className="px-4 py-4 text-sm text-slate-300">{row.totalProjects}</td>
                              <td className="px-4 py-4 text-sm text-lime-300">{row.approved}</td>
                              <td className="px-4 py-4 text-sm text-emerald-300">{row.accepted}</td>
                              <td className="px-4 py-4 text-sm text-rose-300">{row.rejected}</td>
                              <td className="px-4 py-4 text-sm text-amber-300">{row.inProgress}</td>
                              <td className="px-4 py-4 text-sm text-sky-300">{row.reviewQueue}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-500">
                              No inspection records are visible for this report scope yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="flex flex-col  xl:grid-cols-[1.1fr_1fr]">
                  <AuditCard
                    title="Full Inspection Audit View"
                    subtitle="Detailed project-level snapshot showing status, ownership, and key decision timestamps."
                  >
                    <div className="mb-4">
                      <input
                        type="text"
                        value={auditSearchTerm}
                        onChange={(event) => setAuditSearchTerm(event.target.value)}
                        placeholder="Search audit table by project ID, client, status, reviewer..."
                        className="w-[20%] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-orange-500"
                      />
                    </div>
                    <div className="max-h-[34rem] overflow-auto">
                      <table className="min-w-full text-left">
                        <thead className="sticky top-0 z-10 bg-[#091122] text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          <tr>
                            <th className="px-4 py-4">S/n</th>
                            <th className="px-4 py-4">Project ID</th>
                            <th className="px-4 py-4">Client</th>
                            <th className="px-4 py-4">Inspection Company</th>
                            <th className="px-4 py-4">Inspection By</th>
                            <th className="px-4 py-4">Inspection Start Time</th>
                            <th className="px-4 py-4">Inspection End Time</th>
                            <th className="px-4 py-4">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredAuditRows.length > 0 ? filteredAuditRows.map((project, rowIndex) => {
                            const readProjectValue = (...keys) =>
                              pickFirstValue(
                                ...keys.map((key) => project?.[key]),
                                ...keys.map((key) => project?.report?.[key]),
                                ...keys.map((key) => project?.report?.general?.[key]),
                              );

                            const projectDocKey = String(project.id || "").trim();
                            const projectBusinessKey = String(project.projectId || "").trim();
                            const projectFeedback =
                              latestFeedbackByProjectKey.get(projectDocKey) ||
                              latestFeedbackByProjectKey.get(projectBusinessKey) ||
                              null;
                            const latestExternalDecision =
                              latestExternalDecisionByProjectKey.get(projectDocKey) ||
                              latestExternalDecisionByProjectKey.get(projectBusinessKey) ||
                              null;

                            const inspectorUserId = String(
                              pickFirstValue(
                                project?.inspectorId,
                                project?.assignedInspectorId,
                                project?.report?.inspectorId,
                              ) || "",
                            ).trim();
                            const inspectorEmail = String(
                              pickFirstValue(
                                project?.inspectorEmail,
                                project?.report?.inspectorEmail,
                                project?.report?.general?.inspectorEmail,
                              ) || "",
                            )
                              .trim()
                              .toLowerCase();
                            const inspectorUser =
                              usersById.get(inspectorUserId) ||
                              usersByEmail.get(inspectorEmail) ||
                              null;

                            const resolveVerificationOfficer = (index) => {
                              const primarySuffix = String(index + 1);
                              const legacySuffix = String(index);
                              const reviewerId = pickFirstValue(
                                readProjectValue(
                                  `verificationOfficer${index}Id`,
                                  `verifOfficer${index}Id`,
                                  `externalReviewer${primarySuffix}Id`,
                                  `externalReviewerId${primarySuffix}`,
                                  `externalReviewer${legacySuffix}Id`,
                                  `externalReviewerId${legacySuffix}`,
                                ),
                              );
                              const reviewerFromDirectory = usersById.get(
                                String(reviewerId || "").trim(),
                              );
                              const reviewerEmail = String(
                                pickFirstValue(
                                  readProjectValue(
                                    `verificationOfficer${index}Email`,
                                    `verifOfficer${index}Email`,
                                    `externalReviewer${primarySuffix}Email`,
                                    `externalReviewerEmail${primarySuffix}`,
                                    `externalReviewer${legacySuffix}Email`,
                                    `externalReviewerEmail${legacySuffix}`,
                                  ),
                                  reviewerFromDirectory?.email,
                                ) || "",
                              )
                                .trim()
                                .toLowerCase();
                              const name = pickFirstValue(
                                readProjectValue(
                                  `verificationOfficer${index}`,
                                  `verificationOfficer${index}Name`,
                                  `verifOfficer${index}`,
                                  `verifOfficer${index}Name`,
                                  `externalReviewer${primarySuffix}`,
                                  `externalReviewer${primarySuffix}Name`,
                                  `externalReviewerName${primarySuffix}`,
                                  `externalReviewer${legacySuffix}`,
                                  `externalReviewer${legacySuffix}Name`,
                                  `externalReviewerName${legacySuffix}`,
                                ),
                                reviewerFromDirectory?.fullName,
                                reviewerFromDirectory?.name,
                                reviewerFromDirectory?.displayName,
                                reviewerFromDirectory?.email,
                              );
                              const reviewerNameKey = String(name || "").trim().toLowerCase();
                              const reviewerIdKey = String(reviewerId || "").trim().toLowerCase();
                              const projectKeys = [projectDocKey, projectBusinessKey].filter(Boolean);
                              const reviewerKeys = [reviewerIdKey, reviewerEmail, reviewerNameKey].filter(Boolean);
                              const roleAliases = [
                                `verification_officer_${index}`,
                                `verificationofficer${index}`,
                                `verification_officer${index + 1}`,
                                `verificationofficer${index + 1}`,
                              ];
                              const directTimelineMatches = projectKeys.flatMap((pKey) => {
                                const feedbackMatches = reviewerKeys
                                  .map((rKey) => feedbackTimelineByProjectReviewer.get(`${pKey}::${rKey}`))
                                  .filter(Boolean);
                                const reviewMatches = reviewerKeys
                                  .map((rKey) => reviewTimelineByProjectReviewer.get(`${pKey}::${rKey}`))
                                  .filter(Boolean);
                                return [...feedbackMatches, ...reviewMatches];
                              });
                              const roleTimelineMatches = projectKeys.flatMap((pKey) =>
                                roleAliases
                                  .map((role) => reviewTimelineByProjectRole.get(`${pKey}::${role}`))
                                  .filter(Boolean),
                              );
                              const timelineMatches = directTimelineMatches.length
                                ? directTimelineMatches
                                : roleTimelineMatches;
                              const inferredStartTime = timelineMatches.length
                                ? Math.min(...timelineMatches.map((entry) => Number(entry.firstAt || 0)).filter(Boolean))
                                : 0;
                              const inferredEndTime = timelineMatches.length
                                ? Math.max(...timelineMatches.map((entry) => Number(entry.lastAt || 0)).filter(Boolean))
                                : 0;
                              const inferredStatus = [...timelineMatches]
                                .sort((left, right) => Number(right?.lastAt || 0) - Number(left?.lastAt || 0))
                                .map((entry) => String(entry?.latestStatus || "").trim())
                                .find(Boolean);
                              const startTime = pickFirstValue(
                                readProjectValue(
                                  `verificationOfficer${index}StartTime`,
                                  `verifOfficer${index}StartTime`,
                                  `externalReviewer${primarySuffix}StartTime`,
                                  `externalReviewerStartTime${primarySuffix}`,
                                  `externalReviewer${legacySuffix}StartTime`,
                                  `externalReviewerStartTime${legacySuffix}`,
                                ),
                                inferredStartTime || null,
                              );
                              const endTime = pickFirstValue(
                                readProjectValue(
                                  `verificationOfficer${index}EndTime`,
                                  `verifOfficer${index}EndTime`,
                                  `externalReviewer${primarySuffix}EndTime`,
                                  `externalReviewerEndTime${primarySuffix}`,
                                  `externalReviewer${legacySuffix}EndTime`,
                                  `externalReviewerEndTime${legacySuffix}`,
                                ),
                                inferredEndTime || null,
                              );
                              const status = pickFirstValue(
                                readProjectValue(
                                  `verificationOfficer${index}Status`,
                                  `verifOfficer${index}Status`,
                                  `externalReviewer${primarySuffix}Status`,
                                  `externalReviewerStatus${primarySuffix}`,
                                  `externalReviewer${legacySuffix}Status`,
                                  `externalReviewerStatus${legacySuffix}`,
                                ),
                                inferredStatus,
                              );

                              return { name, startTime, endTime, status };
                            };

                            const officer1 = resolveVerificationOfficer(1);
                            const officer2 = resolveVerificationOfficer(2);
                            const officer3 = resolveVerificationOfficer(3);
                            const officer4 = resolveVerificationOfficer(4);
                            const officer5 = resolveVerificationOfficer(5);

                            const verificationLead = pickFirstValue(
                              project?.verificationLeadName,
                              project?.verificationLead,
                              project?.report?.verificationLeadName,
                              project?.report?.verificationLead,
                            );
                            const verificationLeadStartTime = readProjectValue(
                              "verificationLeadStartTime",
                              "verifLeadStartTime",
                              "externalReviewerLeadStartTime",
                            );
                            const verificationLeadEndTime = readProjectValue(
                              "verificationLeadEndTime",
                              "verifLeadEndTime",
                              "externalReviewerLeadEndTime",
                            );
                            const verificationLeadStatus = readProjectValue(
                              "verificationLeadStatus",
                              "verifLeadStatus",
                              "externalReviewerLeadStatus",
                            );

                            const normalizedOperationalStatus = String(
                              getOperationalStatusText(project) || "",
                            )
                              .trim()
                              .toLowerCase();
                            const isApprovedLikeStatus =
                              normalizedOperationalStatus === "approved" ||
                              normalizedOperationalStatus === "accepted" ||
                              normalizedOperationalStatus === "report accepted" ||
                              normalizedOperationalStatus === "reported accepted";
                            const isAcceptedStatus =
                              normalizedOperationalStatus === "accepted" ||
                              normalizedOperationalStatus === "report accepted" ||
                              normalizedOperationalStatus === "reported accepted";
                            const isPendingConfirmationStatus =
                              normalizedOperationalStatus.startsWith("pending confirmation");

                            const inspectionStartTimeDisplay = pickFirstValue(
                              readProjectValue(
                                "inspectionStartTime",
                                "inspectionStartedAt",
                                "startedAt",
                                "startTime",
                                "inProgressAt",
                              ),
                              getProjectStartDate(project),
                            );
                            const inspectionEndTimeDisplay = pickFirstValue(
                              readProjectValue(
                                "inspectionEndTime",
                                "inspectionEndedAt",
                                "inspectionEndDate",
                                "endTime",
                              ),
                              getProjectEndDate(project),
                            );
                            const isCurrentlyApproved = normalizedOperationalStatus === "approved";
                            const capturedApprovedBy = pickFirstValue(
                              readProjectValue(
                                "approvedByName",
                                "approvedBy",
                                "approvedByUser",
                                "approvedByEmail",
                                "managerApprovedBy",
                              ),
                              project?.approvedBy,
                              project?.confirmedBy,
                              project?.reportAcceptedBy,
                            );
                            const approvedByDisplay = pickFirstValue(
                              capturedApprovedBy,
                              isCurrentlyApproved ? getDecisionBy(project, latestExternalDecision) : "",
                            );
                            const capturedApprovalTime = pickFirstValue(
                              readProjectValue(
                                "approvalTime",
                                "approvalTimestamp",
                                "approvedAt",
                                "managerApprovalAt",
                              ),
                              project?.approvedAt,
                              project?.managerApprovalAt,
                            );
                            const approvalTimeDisplay = pickFirstValue(
                              capturedApprovalTime,
                              isCurrentlyApproved
                                ? pickFirstValue(
                                    getDecisionAt(project, latestExternalDecision),
                                    project?.clientReviewDecisionAt,
                                  )
                                : "",
                            );
                            const capturedSupervisedBy = pickFirstValue(
                              readProjectValue(
                                "supervisedBy",
                                "supervisorApprovedBy",
                                "leadInspectorApprovedBy",
                                "reviewedBy",
                                "reviewedByName",
                              ),
                            );
                            const supervisedByDisplay = pickFirstValue(
                              isPendingConfirmationStatus ? capturedSupervisedBy : "",
                              isPendingConfirmationStatus
                                ? pickFirstValue(
                                    project.supervisorName,
                                    project.assignedSupervisorName,
                                    project?.report?.signoff?.reviewer,
                                  )
                                : "",
                            );

                            const reportAcceptedTime = pickFirstValue(
                              project?.reportAcceptedAt,
                              project?.acceptedAt,
                              project?.report?.acceptedAt,
                            );
                            const reportRejectedTime = pickFirstValue(
                              project?.reportRejectedAt,
                              project?.rejectedAt,
                              project?.report?.rejectedAt,
                            );

                            const verificationFeedback = pickFirstValue(
                              projectFeedback?.feedback,
                              projectFeedback?.comment,
                              projectFeedback?.comments,
                              projectFeedback?.observation,
                              project?.verificationFeedback,
                              project?.reviewFeedback,
                              project?.report?.verificationFeedback,
                              project?.report?.reviewFeedback,
                              project?.report?.feedback,
                            );

                            const nextInspectionDate = pickFirstValue(
                              readProjectValue("nextInspectionDate", "dueDate", "nextInspectionDueDate"),
                              project?.equipmentSnapshot?.nextInspection?.dueDate,
                              project?.nextInspection?.dueDate,
                            );

                            const lastInspectionDate = pickFirstValue(
                              readProjectValue("lastInspectionDate"),
                              project?.equipmentSnapshot?.lastInspection?.completedAt,
                              project?.lastInspection?.completedAt,
                              project?.approvedAt,
                            );

                            const verificationCountdownTimer = formatCountdown(
                              readProjectValue(
                                "verificationCountdownTimer",
                                "verificationCountdown",
                                "verificationTimer",
                                "verification_countdown_timer",
                              ),
                              readProjectValue(
                                "verificationDeadline",
                                "verificationDueAt",
                                "verificationDeadlineAt",
                              ),
                            );

                            const operationalCountdownTimer = formatCountdown(
                              readProjectValue("countdownTimer", "inspectionCountdownTimer"),
                              nextInspectionDate,
                            );
                            const inspectionCompanyDisplay = asText(
                              readProjectValue("inspectionCompany", "companyName", "inspectionCompanyName") ||
                                "Phenomenal Energy",
                            );
                            const inspectionByDisplay = asText(
                              project.inspectorName ||
                                project.assignedInspectorName ||
                                project?.report?.signoff?.inspector,
                            );
                            const finalReportStatus = asText(
                              project.finalStatus || project.status || normalizeProjectStatus(project),
                            );
                            const reportDownloadCount = asText(
                              readProjectValue(
                                "reportDownloadCount",
                                "report_download_count",
                                "downloadCount",
                                "reportDownloadCounter",
                              ),
                            );
                            const equipmentInspected = asText(
                              project.tag ||
                                project.equipmentCategory ||
                                project.assetType ||
                                project.equipmentTag ||
                                project?.report?.general?.equipment,
                            );
                            const inspectionTypeDisplay = asText(
                              readProjectValue(
                                "requiredTechnique",
                                "required_technique",
                                "selectedTechnique",
                                "reportTemplate",
                              ) ||
                                project.requiredTechnique ||
                                project.inspectionTypeName ||
                                project.inspectionTypeCode ||
                                project?.report?.general?.inspectionTypeName ||
                                project?.report?.general?.inspectionTypeCode,
                            );
                            const verificationLeadDuration = formatReviewDuration(
                              verificationLeadStartTime,
                              verificationLeadEndTime,
                            );
                            const officer1Duration = formatReviewDuration(officer1.startTime, officer1.endTime);
                            const officer2Duration = formatReviewDuration(officer2.startTime, officer2.endTime);
                            const officer3Duration = formatReviewDuration(officer3.startTime, officer3.endTime);
                            const officer4Duration = formatReviewDuration(officer4.startTime, officer4.endTime);
                            const officer5Duration = formatReviewDuration(officer5.startTime, officer5.endTime);

                            const auditDetailFields = [
                              { label: "Client", value: asText(project.clientName || project.client) },
                              {
                                label: "Inspection Company",
                                value: asText(
                                   "Phenomenal Energy",
                                ),
                              },
                              {
                                label: "Inspection By",
                                value: asText(
                                  project.inspectorName ||
                                    project.assignedInspectorName ||
                                    project?.report?.signoff?.inspector,
                                ),
                              },
                              {
                                label: "Supervised By",
                                value: asText(supervisedByDisplay),
                              },
                              { label: "Verification Officer 1", value: asText(officer1.name) },
                              { label: "Verif_Officer1 End Time", value: formatDateTime(officer1.endTime) },
                              { label: "Verif_Officer1 Status", value: asText(officer1.status) },
                              { label: "Verification Officer 2", value: asText(officer2.name) },
                              { label: "Verif_Officer2 Start Time", value: formatDateTime(officer2.startTime) },
                              { label: "Verif_Officer2 End Time", value: formatDateTime(officer2.endTime) },
                              { label: "Verif_Officer2 Status", value: asText(officer2.status) },
                              { label: "Verification Officer 3", value: asText(officer3.name) },
                              { label: "Verif_Officer3 Start Time", value: formatDateTime(officer3.startTime) },
                              { label: "Verif_Officer3 End Time", value: formatDateTime(officer3.endTime) },
                              { label: "Verif_Officer3 Status", value: asText(officer3.status) },
                              { label: "Verification Officer 4", value: asText(officer4.name) },
                              { label: "Verif_Officer4 Start Time", value: formatDateTime(officer4.startTime) },
                              { label: "Verif_Officer4 End Time", value: formatDateTime(officer4.endTime) },
                              { label: "Verif_Officer4 Status", value: asText(officer4.status) },
                              { label: "Verification Officer 5", value: asText(officer5.name) },
                              { label: "Verif_Officer5 Start Time", value: formatDateTime(officer5.startTime) },
                              { label: "Verif_Officer5 End Time", value: formatDateTime(officer5.endTime) },
                              { label: "Verif_Officer5 Status", value: asText(officer5.status) },
                              { label: "Verification Lead", value: asText(verificationLead) },
                              {
                                label: "Verif_Lead Start Time",
                                value: formatDateTime(verificationLeadStartTime),
                              },
                              { label: "Verif_Lead End Time", value: formatDateTime(verificationLeadEndTime) },
                              { label: "Verif_Lead Status", value: asText(verificationLeadStatus) },
                              {
                                label: "Report_Download_Count",
                                value: asText(
                                  readProjectValue(
                                    "reportDownloadCount",
                                    "report_download_count",
                                    "downloadCount",
                                    "reportDownloadCounter",
                                  ),
                                ),
                              },
                              {
                                label: "Equipment Inspected",
                                value: asText(
                                  
                                    project.tag ||
                                    project.equipmentCategory ||
                                    project.assetType ||
                                    project.equipmentTag ||
                                    project?.report?.general?.equipment,
                                ),
                              },
                              {
                                label: "Inspection Type",
                                value: asText(
                                  readProjectValue(
                                    "requiredTechnique",
                                    "required_technique",
                                    "selectedTechnique",
                                    "reportTemplate",
                                  ) ||
                                    project.requiredTechnique ||
                                    project.inspectionTypeName ||
                                    project.inspectionTypeCode ||
                                    project?.report?.general?.inspectionTypeName ||
                                    project?.report?.general?.inspectionTypeCode,
                                ),
                              },
                              { label: "Last Inspection Date", value: formatDateTime(lastInspectionDate) },
                              { label: "Next Inspection Date", value: formatDateTime(nextInspectionDate) },
                              { label: "Countdown Timer", value: operationalCountdownTimer },
                              {
                                label: "Login Timestamp",
                                value: formatDateTime(
                                  pickFirstValue(
                                    readProjectValue(
                                      "loginTimestamp",
                                      "inspectorLoginTimestamp",
                                      "userLoginTimestamp",
                                    ),
                                    inspectorUser?.loginTimestamp,
                                    inspectorUser?.lastSignInTime,
                                  ),
                                ),
                              },
                              {
                                label: "Logout Timestamp",
                                value: formatDateTime(
                                  pickFirstValue(
                                    readProjectValue(
                                      "logoutTimestamp",
                                      "inspectorLogoutTimestamp",
                                      "userLogoutTimestamp",
                                    ),
                                    inspectorUser?.logoutTimestamp,
                                    inspectorUser?.lastLogoutAt,
                                  ),
                                ),
                              },
                              {
                                label: "User Last Login Time",
                                value: formatDateTime(
                                  pickFirstValue(
                                    readProjectValue("userLastLoginTime", "lastLoginAt"),
                                    inspectorUser?.lastLoginAt,
                                    inspectorUser?.lastSignInTime,
                                  ),
                                ),
                              },
                              {
                                label: "User Email Address",
                                value: asText(
                                  project.inspectorEmail ||
                                    inspectorUser?.email ||
                                    project?.report?.general?.inspectorEmail ||
                                    user?.email,
                                ),
                              },
                            ];

                            return (
                            <tr key={project.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-4 text-xs text-slate-300">{rowIndex + 1}</td>
                              <td className="px-4 py-4 text-xs text-slate-300">
                                {asText(`${project.projectName || ""} - ${project.projectId || ""}`)}
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-300">{asText(project.clientName || project.client)}</td>
                              <td className="px-4 py-4 text-xs text-slate-300">{inspectionCompanyDisplay}</td>
                              <td className="px-4 py-4 text-xs text-slate-300">{inspectionByDisplay}</td>
                              <td className="px-4 py-4 text-xs text-slate-300">{formatDateTime(inspectionStartTimeDisplay)}</td>
                              <td className="px-4 py-4 text-xs text-slate-300">{formatDateTime(inspectionEndTimeDisplay)}</td>
                              <td className="px-4 py-4 text-xs text-slate-300">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveAuditRow({
                                      projectLabel: asText(project.projectName || project.projectId || project.id),
                                      fields: auditDetailFields,
                                    })
                                  }
                                  className="rounded-lg border border-orange-500 bg-orange-500 px-3 py-1 font-bold uppercase tracking-[0.14em] text-slate-200 hover:border-orange-500 hover:text-white"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                            );
                          }) : (
                            <tr>
                              <td colSpan="8" className="px-4 py-12 text-center text-sm text-slate-500">
                                No inspection records are visible for this report scope yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </AuditCard>


                </section>
                {activeAuditRow ? (
                  <AuditDetailsModal
                    title={activeAuditRow.projectLabel}
                    fields={activeAuditRow.fields}
                    onClose={() => setActiveAuditRow(null)}
                  />
                ) : null}

                
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
{/*<AuditCard
                    title="Activity Audit Trail"
                    subtitle="Recent operational events connected to the visible inspection scope."
                  >
                    <div className="space-y-3">
                      {recentAuditTrail.length > 0 ? (
                        recentAuditTrail.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${normalizeAuditTone(entry.type)}`}
                              >
                                {entry.type || "info"}
                              </span>
                              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                {formatDateTime(entry.timestamp)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              {entry.message || "Activity recorded."}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                              <span>Target: {entry.target || "NULL"}</span>
                              <span>User: {entry.userEmail || "System"}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-4 py-10 text-center text-sm text-slate-500">
                          No audit trail entries are visible for this report scope yet.
                        </div>
                      )}
                    </div>
                  </AuditCard>*/}
const MetricCard = ({ icon, label, value, tone }) => {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : tone === "rose"
        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
        : tone === "sky"
          ? "border-sky-500/20 bg-sky-500/10 text-sky-300"
          : "border-orange-500/20 bg-orange-500/10 text-orange-300";

  return (
    <div className="rounded-[1.7rem] border border-slate-800/80 bg-[#08101f]/95 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.3)]">
      <div className={`inline-flex rounded-2xl border p-3 ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
};

const ChartCard = ({ title, subtitle, icon, children }) => (
  <section className="rounded-[2rem] border border-slate-800/80 bg-[#08101f]/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
    <div className="mb-5 flex items-center gap-3">
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2 text-orange-400">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const AuditCard = ({ title, subtitle, children }) => (
  <section className="rounded-[2rem] border border-slate-800/80 bg-[#08101f]/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
    <div className="mb-5">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
    {children}
  </section>
);

const AuditDetailsModal = ({ title, fields, onClose }) => {
  const handleDownload = async () => {
    const fileName = `${String(title || "audit-details")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80)}.pdf`;

    const printableRoot = document.createElement("div");
    printableRoot.style.padding = "20px";
    printableRoot.style.fontFamily = "Arial, sans-serif";
    printableRoot.style.color = "#0f172a";
    printableRoot.style.background = "#ffffff";

    const heading = document.createElement("h2");
    heading.textContent = `Audit Row Details - ${String(title || "N/A")}`;
    heading.style.fontSize = "16px";
    heading.style.margin = "0 0 12px 0";
    printableRoot.appendChild(heading);

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "11px";

    fields.forEach((field) => {
      const row = document.createElement("tr");

      const labelCell = document.createElement("td");
      labelCell.textContent = String(field?.label || "");
      labelCell.style.border = "1px solid #cbd5e1";
      labelCell.style.padding = "6px";
      labelCell.style.fontWeight = "700";
      labelCell.style.width = "35%";

      const valueCell = document.createElement("td");
      valueCell.textContent = String(field?.value || "N/A");
      valueCell.style.border = "1px solid #cbd5e1";
      valueCell.style.padding = "6px";
      valueCell.style.width = "65%";

      row.appendChild(labelCell);
      row.appendChild(valueCell);
      table.appendChild(row);
    });

    printableRoot.appendChild(table);
    document.body.appendChild(printableRoot);

    try {
      await html2pdf()
        .from(printableRoot)
        .set({
          margin: [10, 10, 10, 10],
          filename: fileName,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();
    } finally {
      printableRoot.remove();
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-[#08101f] shadow-[0_24px_80px_rgba(2,6,23,0.6)]">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Audit Row Details</p>
            <h3 className="mt-1 text-base font-black text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg border border-emerald-500 bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-emerald-500"
            >
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-200 hover:border-orange-500 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{field.label}</p>
                <p className="mt-1 text-sm text-slate-200">{field.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inspection360Summary;
