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
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import { matchesExternalReviewerProject } from "../../../utils/externalReviewerAccess";
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
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const logsQuery = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(200));
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      setActivityLogs(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
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

  const scopedProjectKeys = useMemo(
    () =>
      new Set(
        scopedProjects.flatMap((project) =>
          [String(project.id || "").trim(), String(project.projectId || "").trim()].filter(Boolean),
        ),
      ),
    [scopedProjects],
  );

  const scopedFeedback = useMemo(
    () =>
      feedbackEntries.filter((entry) =>
        scopedProjectKeys.has(String(entry.projectDocId || "").trim()) ||
        scopedProjectKeys.has(String(entry.projectId || "").trim()),
      ),
    [feedbackEntries, scopedProjectKeys],
  );

  const scopedLogs = useMemo(() => {
    const currentEmail = String(user?.email || "").trim().toLowerCase();
    return activityLogs.filter((entry) => {
      const target = String(entry.target || "").trim();
      const logEmail = String(entry.userEmail || "").trim().toLowerCase();
      return scopedProjectKeys.has(target) || (!!currentEmail && logEmail === currentEmail) || user?.role === "Admin";
    });
  }, [activityLogs, scopedProjectKeys, user?.email, user?.role]);

  const statusSummary = useMemo(() => {
    const counts = scopedProjects.reduce((accumulator, project) => {
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
  }, [scopedProjects]);

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

    const projectsInClientReview = scopedProjects.filter(
      (project) => normalizeProjectStatus(project) === "Client Review",
    ).length;

    return {
      approved: counts.approved,
      rejected: counts.rejected,
      inReview: projectsInClientReview,
      pending: Math.max(scopedProjects.length - counts.approved - counts.rejected - projectsInClientReview, 0),
    };
  }, [scopedFeedback, scopedProjects]);

  const clientSummaryRows = useMemo(() => {
    const grouped = scopedProjects.reduce((accumulator, project) => {
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
  }, [scopedProjects]);

  const auditRows = useMemo(
    () =>
      [...scopedProjects]
        .sort((left, right) => {
          const leftValue = Math.max(
            toMillis(left.updatedAt),
            toMillis(left.reportAcceptedAt),
            toMillis(left.reportRejectedAt),
            toMillis(left.createdAt),
          );
          const rightValue = Math.max(
            toMillis(right.updatedAt),
            toMillis(right.reportAcceptedAt),
            toMillis(right.reportRejectedAt),
            toMillis(right.createdAt),
          );
          return rightValue - leftValue;
        })
        .slice(0, 20),
    [scopedProjects],
  );

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
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Generated
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{formatDateTime(Date.now())}</p>
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
                    value={String(scopedProjects.length)}
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

                <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
                  <AuditCard
                    title="Full Inspection Audit View"
                    subtitle="Detailed project-level snapshot showing status, ownership, and key decision timestamps."
                  >
                    <div className="max-h-[34rem] overflow-auto">
                      <table className="min-w-full text-left">
                        <thead className="sticky top-0 z-10 bg-[#091122] text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          <tr>
                            <th className="px-4 py-4">Project</th>
                            <th className="px-4 py-4">Client</th>
                            <th className="px-4 py-4">Current Status</th>
                            <th className="px-4 py-4">Inspector</th>
                            <th className="px-4 py-4">Last Updated</th>
                            <th className="px-4 py-4">Decision Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {auditRows.map((project) => (
                            <tr key={project.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-4">
                                <div className="text-sm font-semibold text-white">
                                  {project.projectName || project.projectId || project.id}
                                </div>
                                <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                  {project.projectId || project.id}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-300">
                                {project.clientName || project.client || "N/A"}
                              </td>
                              <td className="px-4 py-4">
                                <span className="inline-flex rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                                  {normalizeProjectStatus(project)}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-300">
                                {project.inspectorName || project.assignedInspectorName || "N/A"}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-300">
                                {formatDateTime(project.updatedAt || project.createdAt)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-300">
                                {formatDateTime(
                                  project.reportAcceptedAt || project.reportRejectedAt || project.clientReviewDecisionAt,
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AuditCard>

                  <AuditCard
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
                              <span>Target: {entry.target || "N/A"}</span>
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
                  </AuditCard>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

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

export default Inspection360Summary;
