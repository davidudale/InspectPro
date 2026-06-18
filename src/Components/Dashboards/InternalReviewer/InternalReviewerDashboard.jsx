import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardCheck,
  Clock,
  FileSearch,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import InternalReviewerNavbar from "./InternalReviewerNavbar";
import InternalReviewerSidebar from "./InternalReviewerSidebar";

ChartJS.register(ArcElement, Legend, Tooltip);

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const getMarker = (value) => {
  const millis = toMillis(value);
  return millis ? String(millis) : "";
};

const InternalReviewerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [reviewTemplateCount, setReviewTemplateCount] = useState(0);
  const [issues, setIssues] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const seenInSessionRef = useRef({ pending: [], returned: [] });

  const displayName =
    user?.fullName || user?.name || user?.displayName || user?.email || "Internal Reviewer";

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      setProjects(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "equipment"), (snapshot) => {
      setEquipmentCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "inspection_type"), (snapshot) => {
      setReviewTemplateCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "issue_logs"), (snapshot) => {
      setIssues(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.email) {
      setLogs([]);
      return undefined;
    }

    const activityQuery = query(
      collection(db, "activity_logs"),
      where("userEmail", "==", user.email),
      limit(20),
    );

    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      const nextLogs = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp))
        .slice(0, 10);
      setLogs(nextLogs);
    });

    return () => unsubscribe();
  }, [user?.email]);

  useEffect(() => {
    if (!user?.uid) {
      setNotificationQueue([]);
      setActiveNotification(null);
      seenInSessionRef.current = { pending: [], returned: [] };
      return;
    }

    const seen = seenInSessionRef.current;
    const nextNotifications = [];

    projects.forEach((project) => {
      const projectLabel = project.projectName || project.projectId || project.id;
      const status = String(project.status || "").toLowerCase();
      const updatedMarker =
        getMarker(project.updatedAt) ||
        getMarker(project.lastUpdated) ||
        getMarker(project.internalReviewForwardedAt) ||
        "na";
      const internalComment = String(project.internalReviewComment || project.returnNote || "").trim();
      const isPendingInternalReview =
        status === "pending engineering evaluation" ||
        status === "pending internal review" ||
        status === "internal review in progress";
      const isReturnedInternalReview = status === "returned by internal reviewer";

      if (isPendingInternalReview) {
        const pendingSignature = `${project.id}|${status}|${updatedMarker}`;
        if (!seen.pending.includes(pendingSignature)) {
          nextNotifications.push({
            key: `internal-pending-${project.id}`,
            title: "Pending Engineering Evaluation",
            message: `Project ${projectLabel} is waiting for engineering evaluation.`,
            tone: "new",
          });
          seen.pending.push(pendingSignature);
        }
      }

      if (isReturnedInternalReview && internalComment) {
        const returnedSignature = `${project.id}|${status}|${updatedMarker}|${internalComment}`;
        if (!seen.returned.includes(returnedSignature)) {
          nextNotifications.push({
            key: `internal-returned-${project.id}`,
            title: "Returned By Internal Review",
            message: `Project ${projectLabel} has an internal review return note.`,
            tone: "returned",
          });
          seen.returned.push(returnedSignature);
        }
      }
    });

    if (nextNotifications.length > 0) {
      const returnedFirst = [
        ...nextNotifications.filter((item) => item.tone === "returned"),
        ...nextNotifications.filter((item) => item.tone !== "returned"),
      ];

      setNotificationQueue((prev) => {
        const existingKeys = new Set(prev.map((item) => item.key));
        const dedupedIncoming = returnedFirst.filter((item) => !existingKeys.has(item.key));
        return [...prev, ...dedupedIncoming];
      });
    }
  }, [projects, user?.uid]);

  useEffect(() => {
    if (activeNotification || notificationQueue.length === 0) return;
    setActiveNotification(notificationQueue[0]);
    setNotificationQueue((prev) => prev.slice(1));
  }, [activeNotification, notificationQueue]);

  const metrics = useMemo(() => {
    const pendingInternalReviews = projects.filter(
      (project) =>
        [
          "pending engineering evaluation",
          "pending internal review",
          "internal review in progress",
        ].includes(
          String(project.status || "").trim().toLowerCase(),
        ),
    ).length;
    const approvedInternalReviews = projects.filter(
      (project) => String(project.internalReviewStatus || "").trim().toLowerCase() === "approved",
    ).length;
    const openIssues = issues.filter(
      (issue) => !["resolved", "closed"].includes(String(issue.status || "").toLowerCase()),
    ).length;

    return {
      pendingInternalReviews,
      approvedInternalReviews,
      openIssues,
    };
  }, [issues, projects]);

  const stats = [
    {
      label: "Pending Reviews",
      value: loading ? "..." : String(metrics.pendingInternalReviews),
      icon: <ClipboardCheck className="text-orange-500" size={16} />,
      trend: "Projects currently waiting for internal review decisions",
    },
    {
      label: "Approved Reviews",
      value: loading ? "..." : String(metrics.approvedInternalReviews),
      icon: <ShieldCheck className="text-orange-500" size={16} />,
      trend: "Projects already cleared by internal review",
    },
    {
      label: "Equipment Registry",
      value: loading ? "..." : String(equipmentCount),
      icon: <Boxes className="text-orange-500" size={16} />,
      trend: "Assets available across the project review scope",
    },
    {
      label: "Open Issues",
      value: loading ? "..." : String(metrics.openIssues),
      icon: <AlertTriangle className="text-orange-500" size={16} />,
      trend: "Project issues still requiring review follow-up",
    },
  ];

  const quickActions = [
    {
      title: "Open internal review queue",
      description: "Continue project reviews awaiting internal reviewer action.",
      onClick: () => navigate("/internal-reviewer/projects"),
    },
    {
      title: "Review submitted issues",
      description: "Track issues raised during inspection and internal review activity.",
      onClick: () => navigate("/internal-reviewer/issues"),
    },
    {
      title: "Inspect equipment scope",
      description: "Check project equipment coverage before completing review decisions.",
      onClick: () => navigate("/internal-reviewer/equipments"),
    },
  ];

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#020617",
          borderColor: "rgba(148,163,184,0.2)",
          borderWidth: 1,
          titleColor: "#f8fafc",
          bodyColor: "#cbd5e1",
        },
      },
    }),
    [],
  );

  const statCardCharts = useMemo(
    () => [
      {
        data: [metrics.pendingInternalReviews, Math.max(projects.length, 1)],
        colors: ["#f97316", "rgba(148,163,184,0.16)"],
      },
      {
        data: [metrics.approvedInternalReviews, Math.max(projects.length, 1)],
        colors: ["#10b981", "rgba(148,163,184,0.16)"],
      },
      {
        data: [equipmentCount, Math.max(projects.length, 1)],
        colors: ["#a855f7", "rgba(148,163,184,0.16)"],
      },
      {
        data: [metrics.openIssues, Math.max(issues.length, 1)],
        colors: ["#38bdf8", "rgba(148,163,184,0.16)"],
      },
    ],
    [equipmentCount, issues.length, metrics, projects.length],
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <InternalReviewerNavbar />
      <div className="flex min-h-screen flex-1">
        <InternalReviewerSidebar />

        <main className="flex-1 ml-16 lg:ml-64 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(180deg,_#070c19_0%,_#090f1d_100%)] px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl space-y-7">
            <header className="rounded-[2rem] border border-slate-800/90 bg-[linear-gradient(135deg,rgba(12,18,36,0.98),rgba(35,22,24,0.94))] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-slate-500">
                    Control Center
                  </p>
                  <h1 className="text-3xl font-black tracking-tight text-white lg:text-5xl">
                    Internal Review
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-400 lg:text-base">
                    Monitor internal review queues, project issue signals, equipment coverage,
                    and review activity from one internal reviewer command surface.
                  </p>
                  <p className="text-sm text-slate-500">
                    Signed in as{" "}
                    <span className="font-semibold text-orange-400">{displayName}</span>
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/40 bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-700"
                  onClick={() => navigate("/internal-reviewer/projects")}
                  title="Open internal review queue"
                  aria-label="Open internal review queue"
                >
                  <Activity size={18} />
                  Open Review Queue
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="flex h-full min-h-[220px] flex-col rounded-[1.6rem] border border-slate-800 bg-[#0a1122] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition hover:border-slate-700"
                >
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-5">
                    <div className="flex min-w-0 h-full flex-col justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200/80">
                        {stat.label}
                      </p>
                      <p className="mt-4 max-w-[15rem] text-sm leading-7 text-slate-400">
                        {stat.trend}
                      </p>
                    </div>
                    <div className="relative h-24 w-24 shrink-0 self-center rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-3">
                      <Doughnut
                        data={{
                          labels: [stat.label, "Remaining"],
                          datasets: [
                            {
                              data: statCardCharts[index].data,
                              backgroundColor: statCardCharts[index].colors,
                              borderWidth: 0,
                            },
                          ],
                        }}
                        options={doughnutOptions}
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-black leading-none text-white">
                          {stat.value}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
              <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
                      Recent Activity
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-white">
                      Latest Internal Review Updates
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate("/internal-reviewer/reviews")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-500/50"
                  >
                    <RefreshCw size={14} />
                    View all
                  </button>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <p className="text-sm text-slate-400">Loading activity...</p>
                    </div>
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5 transition hover:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <p className="text-base font-semibold text-white">
                              {log.message || "Activity logged"}
                              {log.target ? (
                                <span className="ml-2 font-bold text-orange-400">
                                  [{log.target}]
                                </span>
                              ) : null}
                            </p>
                            <p className="text-sm text-slate-400">
                              Internal review activity has been updated.
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            <div>
                              {log.timestamp?.toDate()
                                ? formatDistanceToNow(log.timestamp.toDate(), {
                                    addSuffix: true,
                                  })
                                : "just now"}
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2">
                              <Clock size={10} />
                              <span>{log.userEmail?.split("@")[0] || "System"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <p className="text-sm text-slate-400">No recent activity detected.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
                  <div className="mb-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
                      Quick Actions
                    </p>
                  </div>
                  <div className="space-y-4">
                    {quickActions.map((action) => (
                      <button
                        key={action.title}
                        onClick={action.onClick}
                        className="flex w-full items-start justify-between gap-4 rounded-[1.5rem] border border-slate-800 bg-slate-950/70 px-5 py-5 text-left transition hover:border-orange-500/30"
                      >
                        <div>
                          <p className="text-base font-bold text-white">{action.title}</p>
                          <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">
                            {action.description}
                          </p>
                        </div>
                        <ArrowRight size={18} className="mt-1 shrink-0 text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
                    Review Templates
                  </p>
                  <div className="mt-5 flex items-center justify-between rounded-[1.5rem] border border-slate-800 bg-slate-950/70 px-5 py-5">
                    <div>
                      <p className="text-base font-bold text-white">Inspection Types</p>
                      <p className="mt-2 text-sm text-slate-400">
                        Available reporting templates for context.
                      </p>
                    </div>
                    <span className="text-3xl font-black text-orange-400">
                      {reviewTemplateCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {activeNotification ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <p
              className={`text-xs font-bold uppercase tracking-[0.2em] ${
                activeNotification.tone === "returned" ? "text-rose-400" : "text-orange-400"
              }`}
            >
              Notification
            </p>
            <h3 className="mt-2 text-xl font-bold text-white">{activeNotification.title}</h3>
            <p className="mt-3 text-sm text-slate-300">{activeNotification.message}</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setActiveNotification(null);
                  navigate("/internal-reviewer/projects");
                }}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Open Queue
              </button>
              <button
                onClick={() => setActiveNotification(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-600 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default InternalReviewerDashboard;
