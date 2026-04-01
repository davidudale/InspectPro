import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ShieldCheck,
  PlusCircle,
  ArrowRight,
  ClipboardList,
  MapPinned,
  RefreshCw,
} from "lucide-react";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import { db } from "../Auth/firebase";
import { collection, onSnapshot, query, where, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import InspectorNavbar from "../Dashboards/InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../Dashboards/InspectorsFile/InspectorSidebar";

ChartJS.register(ArcElement, Legend, Tooltip);

const InspectionDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
    const [metrics, setMetrics] = useState({
      active: 0,
      returned: 0,
      completed: 0,
      total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);

  const fullName =
    user?.fullName || user?.name || user?.displayName || user?.email || "Inspector";

  const seenInSessionRef = useRef({ newSent: [], returned: [] });

  const getMarker = (value) => {
    if (!value) return "";
    if (typeof value?.toMillis === "function") return String(value.toMillis());
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    if (value instanceof Date) return String(value.getTime());
    return "";
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return "just now";
    const diffMs = Date.now() - timestamp.toDate().getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Live dashboard metrics for inspector workload
  useEffect(() => {
    if (!user?.uid) {
      setMetrics({ active: 0, returned: 0, completed: 0, total: 0 });
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const totalRef = query(
      collection(db, "projects"),
      where("inspectorId", "==", user.uid),
    );

    const unsubTotal = onSnapshot(totalRef, (snapshot) => {
      const projects = snapshot.docs.map((docItem) => docItem.data());

      const completed = projects.filter(
        (project) => (project?.status || "").toLowerCase() === "completed",
      ).length;
      const returned = projects.filter((project) => {
        const status = (project?.status || "").toLowerCase();
        return status.startsWith("returned for correction - rpt_with ");
      }).length;
      const active = projects.filter((project) => {
        const status = (project?.status || "").toLowerCase();
        if (status === "completed") return false;
        if (status.startsWith("passed and forwarded to ")) return false;
        if (status === "approved") return false;
        if (status.startsWith("pending confirmation")) return false;
        return true;
      }).length;

      setMetrics({
        active,
        returned,
        completed,
        total: projects.length,
      });
      setLoading(false);
    });

    return () => {
      unsubTotal();
    };
  }, [user?.uid]);

  // Recent user-scoped activity feed
  useEffect(() => {
    if (!user?.uid && !user?.email) {
      setActivityLogs([]);
      setLogsLoading(false);
      return undefined;
    }

    setLogsLoading(true);
    const mergeAndSetLogs = (byEmailDocs, byUserIdDocs) => {
      const combined = [...byEmailDocs, ...byUserIdDocs];
      const dedupedMap = new Map();
      combined.forEach((logDoc) => {
        dedupedMap.set(logDoc.id, logDoc);
      });

      const logs = Array.from(dedupedMap.values())
        .map((logDoc) => ({ id: logDoc.id, ...logDoc.data() }))
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
        .slice(0, 5);

      setActivityLogs(logs);
      setLogsLoading(false);
    };

    let emailDocs = [];
    let userIdDocs = [];
    let emailReady = !user?.email;
    let userIdReady = !user?.uid;

    const maybeFinalize = () => {
      if (emailReady && userIdReady) {
        mergeAndSetLogs(emailDocs, userIdDocs);
      }
    };

    let unsubscribeEmail = () => {};
    let unsubscribeUserId = () => {};

    if (user?.email) {
      const logsByEmailRef = query(
        collection(db, "activity_logs"),
        where("userEmail", "==", user.email),
        limit(20),
      );
      unsubscribeEmail = onSnapshot(logsByEmailRef, (snapshot) => {
        emailDocs = snapshot.docs;
        emailReady = true;
        maybeFinalize();
      });
    }

    if (user?.uid) {
      const logsByUserIdRef = query(
        collection(db, "activity_logs"),
        where("userId", "==", user.uid),
        limit(20),
      );
      unsubscribeUserId = onSnapshot(logsByUserIdRef, (snapshot) => {
        userIdDocs = snapshot.docs;
        userIdReady = true;
        maybeFinalize();
      });
    }

    return () => {
      unsubscribeEmail();
      unsubscribeUserId();
    };
  }, [user?.email, user?.uid]);

  // Login-time inspector notifications: new assignments and returned inspections
  useEffect(() => {
    if (!user?.uid) {
      setNotificationQueue([]);
      setActiveNotification(null);
      seenInSessionRef.current = { newSent: [], returned: [] };
      return undefined;
    }

    // Reset per-login session so notifications can show again on each login.
    seenInSessionRef.current = { newSent: [], returned: [] };

    const projectNotificationsRef = query(
      collection(db, "projects"),
      where("inspectorId", "==", user.uid),
      limit(100),
    );

    const unsubscribe = onSnapshot(projectNotificationsRef, (snapshot) => {
      const seen = seenInSessionRef.current;
      const nextNotifications = [];

      snapshot.docs.forEach((docItem) => {
        const project = docItem.data();
        const projectDocId = docItem.id;
        const projectLabel = project.projectName || project.projectId || projectDocId;
        const status = (project.status || "").toLowerCase();
        const updatedMarker =
          getMarker(project.updatedAt) ||
          getMarker(project.returnedAt) ||
          getMarker(project.deploymentDate) ||
          "na";
        const isReturned =
          status.startsWith("returned for correction - rpt_with ");
        const isNewAssignment =
          status.startsWith("not started- report with ");
        const returnedSignature = `${projectDocId}|${status}|${
          getMarker(project.returnedAt) || updatedMarker
        }|${project.returnNote || ""}`;
        const newSignature = `${projectDocId}|${status}|${updatedMarker}`;

        if (isReturned && !seen.returned.includes(returnedSignature)) {
          nextNotifications.push({
            key: `returned-${projectDocId}`,
            title: "Returned Inspection",
            message: `Inspection ${projectLabel} was returned for corrections.`,
            tone: "returned",
          });
          seen.returned.push(returnedSignature);
          return;
        }

        if (isNewAssignment && !seen.newSent.includes(newSignature)) {
          nextNotifications.push({
            key: `new-${projectDocId}`,
            title: "New Inspection Sent",
            message: `A new inspection (${projectLabel}) has been assigned to you.`,
            tone: "new",
          });
          seen.newSent.push(newSignature);
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
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (activeNotification || notificationQueue.length === 0) return;
    setActiveNotification(notificationQueue[0]);
    setNotificationQueue((prev) => prev.slice(1));
  }, [activeNotification, notificationQueue]);

  const stats = [
    {
      label: "Active Inspections",
      value: loading ? "..." : metrics.active.toString(),
      icon: <ClipboardList className="text-orange-500" size={16} />,
      trend: "Projects still active in your workflow",
    },
    {
      label: "Returned Inspections",
      value: loading ? "..." : metrics.returned.toString(),
      icon: <RefreshCw className="text-orange-500" size={16} />,
      trend: "Reports sent back for correction",
    },
    {
      label: "Inspection Completed",
      value: loading ? "..." : metrics.completed.toString(),
      icon: <ShieldCheck className="text-orange-500" size={16} />,
      trend: "Inspections marked completed or closed",
    },

    {
      label: "Projects",
      value: loading ? "..." : metrics.total.toString(),
      icon: <Activity className="text-orange-500" size={16} />,
      trend: `${Math.max(metrics.total - metrics.completed, 0)} still in progress`,
    },
  ];

  const quickActions = [
    {
      title: "Open inspection queue",
      description: "Review assigned inspections and continue current report work.",
      onClick: () => navigate("/Inspection_view"),
    },
    {
      title: "Review returned reports",
      description: "Jump back into inspections that need corrections or updates.",
      onClick: () => navigate("/Inspection_view"),
    },
    {
      title: "Project conversations",
      description: "Open the chat workspace and coordinate with the wider team.",
      onClick: () => navigate("/Inspection_view"),
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
        data: [metrics.active, Math.max(metrics.total - metrics.active, 1)],
        colors: ["#f97316", "rgba(148,163,184,0.16)"],
      },
      {
        data: [metrics.returned, Math.max(metrics.total - metrics.returned, 1)],
        colors: ["#f43f5e", "rgba(148,163,184,0.16)"],
      },
      {
        data: [metrics.completed, Math.max(metrics.total - metrics.completed, 1)],
        colors: ["#10b981", "rgba(148,163,184,0.16)"],
      },
      {
        data: [metrics.total, Math.max(metrics.active + metrics.returned, 1)],
        colors: ["#38bdf8", "rgba(148,163,184,0.16)"],
      },
    ],
    [metrics],
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <InspectorNavbar />
      <div className="flex flex-1 min-h-screen">
        <InspectorSidebar />

        <main className="flex-1 ml-16 lg:ml-64 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(180deg,_#070c19_0%,_#090f1d_100%)] px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl space-y-7">
            <header className="rounded-[2rem] border border-slate-800/90 bg-[linear-gradient(135deg,rgba(12,18,36,0.98),rgba(35,22,24,0.94))] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-slate-500">
                    Control Center
                  </p>
                  <h1 className="text-3xl font-black tracking-tight text-white lg:text-5xl">
                    Inspection Visibility
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-400 lg:text-base">
                    Monitor your assigned inspections, correction loops, and activity
                    stream from one command view.
                  </p>
                  <p className="text-sm text-slate-500">
                    Signed in as{" "}
                    <span className="font-semibold text-orange-400">
                      {fullName || "Inspector"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => navigate("/Inspection_view")}
                  title="Open inspections"
                  aria-label="Open inspections"
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/40 bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 shadow-lg shadow-orange-950/20"
                >
                  <PlusCircle size={18} />
                  Open Inspections
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
                      Latest Inspection Updates
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate("/Inspection_view")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-500/50"
                  >
                    <RefreshCw size={14} />
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {logsLoading ? (
                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <p className="text-sm text-slate-400">Loading activity...</p>
                    </div>
                  ) : activityLogs.length > 0 ? (
                    activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5 transition hover:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <p className="text-base font-semibold text-white">
                              {log.message || "Activity logged"}
                            </p>
                            <p className="text-sm text-slate-400">
                              Inspector-side workflow activity has been updated.
                            </p>
                          </div>
                          <p className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            {formatTimeAgo(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <p className="text-sm text-slate-400">
                        No recent assistant activity for your inspections.
                      </p>
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

              </div>
            </div>
          </div>
        </main>
      </div>
      {activeNotification && (
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
                  navigate("/Inspection_view");
                }}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Open Inspections
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
      )}
    </div>
  );
};

export default InspectionDashboard;
