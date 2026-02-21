import React, { useEffect, useState } from "react";
import {
  Activity,
  ShieldCheck,
  AlertCircle,
  Terminal,
  PlusCircle,
} from "lucide-react";

import { db } from "../Auth/firebase";
import { collection, onSnapshot, query, where, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import InspectorNavbar from "../Dashboards/InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../Dashboards/InspectorsFile/InspectorSidebar";

const InspectionDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    active: 0,
    completed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const fullName =
    user?.fullName || user?.name || user?.displayName || user?.email || "Inspector";

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
      setMetrics({ active: 0, completed: 0, total: 0 });
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const initialized = { active: false, completed: false, total: false };
    const markReady = (key) => {
      if (!initialized[key]) {
        initialized[key] = true;
        if (initialized.active && initialized.completed && initialized.total) {
          setLoading(false);
        }
      }
    };

    const activeRef = query(
      collection(db, "projects"),
      where("inspectorId", "==", user.uid),
      where("status", "==", "Forwarded to Inspector"),
    );
    const completedRef = query(
      collection(db, "projects"),
      where("inspectorId", "==", user.uid),
      where("status", "==", "Completed"),
    );
    const totalRef = query(
      collection(db, "projects"),
      where("inspectorId", "==", user.uid),
    );

    const unsubActive = onSnapshot(activeRef, (snapshot) => {
      setMetrics((prev) => ({ ...prev, active: snapshot.size }));
      markReady("active");
    });
    const unsubCompleted = onSnapshot(completedRef, (snapshot) => {
      setMetrics((prev) => ({ ...prev, completed: snapshot.size }));
      markReady("completed");
    });
    const unsubTotal = onSnapshot(totalRef, (snapshot) => {
      setMetrics((prev) => ({ ...prev, total: snapshot.size }));
      markReady("total");
    });

    return () => {
      unsubActive();
      unsubCompleted();
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

  const stats = [
    {
      label: "Active Inspections",
      value: loading ? "..." : metrics.active.toString(),
      icon: <Activity className="text-orange-500" />,
      trend: "Live assignments",
    },
    {
      label: "Inspection Completed",
      value: loading ? "..." : metrics.completed.toString(),
      icon: <ShieldCheck className="text-emerald-500" />,
      trend: metrics.total ? `${Math.round((metrics.completed / metrics.total) * 100)}% closeout` : "No history",
    },

    {
      label: "Projects",
      value: loading ? "..." : metrics.total.toString(),
      icon: <AlertCircle className="text-red-500" />,
      trend: `${Math.max(metrics.total - metrics.completed, 0)} pending`,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <InspectorNavbar />
      <div className="flex flex-1 min-h-screen">
        <InspectorSidebar />

        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <header className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  System Overview
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Welcome back,{" "}
                    <span className="text-orange-500 font-semibold">
                      {fullName || "Inspector"}
                    </span>
                  .
                </p>
              </div>
              <button
                onClick={() => navigate("/Inspection_view")}
                title="Add Inspection"
                aria-label="Add Inspection"
                className="hidden md:flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-orange-900/20"
              >
                <PlusCircle size={18} />
                New Inspection
              </button>
            </header>

            {/* Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-orange-500/50 transition-colors">
                      {stat.icon}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-tight">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Assistant Activity Log Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Terminal size={20} className="text-orange-500" />
                  <h2 className="font-bold text-white">
                    Assistant Activity Log
                  </h2>
                </div>
                <div className="space-y-4">
                  {logsLoading ? (
                    <div className="flex gap-4 p-3 rounded-xl border-l-2 border-slate-800">
                      <div className="w-2 h-2 rounded-full bg-orange-600 mt-1.5 shrink-0" />
                      <p className="text-sm text-slate-400">Loading activity...</p>
                    </div>
                  ) : activityLogs.length > 0 ? (
                    activityLogs.map((log) => (
                      <div key={log.id} className="flex gap-4 p-3 rounded-xl border-l-2 border-slate-800 hover:border-orange-500 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-orange-600 mt-1.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm text-slate-300">{log.message || "Activity logged"}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            {formatTimeAgo(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex gap-4 p-3 rounded-xl border-l-2 border-slate-800">
                      <div className="w-2 h-2 rounded-full bg-orange-600 mt-1.5 shrink-0" />
                      <p className="text-sm text-slate-400">
                        No recent assistant activity for your inspections.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mb-4">
                  <Activity className="text-slate-600" size={32} />
                </div>
                <h3 className="text-white font-bold">Analytics Engine</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-[250px]">
                  Connect your assistant to view real-time data visualization
                  charts.
                </p>
                <button className="mt-6 text-orange-500 text-xs font-bold uppercase tracking-widest hover:underline">
                  Configure Widget
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InspectionDashboard;
