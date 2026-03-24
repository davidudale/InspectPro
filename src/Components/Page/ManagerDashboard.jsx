import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Boxes,
  ClipboardList,
  Clock,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { db, auth } from "../Auth/firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  limit,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import ManagerNavbar from "../Dashboards/ManagerFile/ManagerNavbar";
import ManagerSidebar from "../Dashboards/ManagerFile/ManagerSidebar";
import { useAuth } from "../Auth/AuthContext";
import { useNavigate } from "react-router-dom";
import ProjectChatbox from "../Common/ProjectChatbox";

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [fullName, setFullName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const seenInSessionRef = useRef({ forwarded: [], returned: [] });

  const getMarker = (value) => {
    if (!value) return "";
    if (typeof value?.toMillis === "function") return String(value.toMillis());
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    if (value instanceof Date) return String(value.getTime());
    return "";
  };

  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setUserCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setCurrentUserEmail(currentUser?.email || "");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserEmail) {
      setLogs([]);
      return undefined;
    }

    const activityQuery = query(
      collection(db, "activity_logs"),
      where("userEmail", "==", currentUserEmail),
      limit(20),
    );

    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      const nextLogs = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
        .slice(0, 10);
      setLogs(nextLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserEmail]);

  useEffect(() => {
    const inspectionRef = collection(db, "projects");
    const unsubscribe = onSnapshot(inspectionRef, (snapshot) => {
      setInspectionCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const equipmentRef = collection(db, "equipment");
    const unsubscribe = onSnapshot(equipmentRef, (snapshot) => {
      setEquipmentCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const reportRef = collection(db, "inspection_type");
    const unsubscribe = onSnapshot(reportRef, (snapshot) => {
      setReportCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;

      try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setFullName(docSnap.data().fullName || docSnap.data().name || "Manager");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setNotificationQueue([]);
      setActiveNotification(null);
      seenInSessionRef.current = { forwarded: [], returned: [] };
      return undefined;
    }

    seenInSessionRef.current = { forwarded: [], returned: [] };

    const projectNotificationsRef = query(
      collection(db, "projects"),
      where("managerId", "==", user.uid),
      limit(100),
    );

    const unsubscribe = onSnapshot(projectNotificationsRef, (snapshot) => {
      const seen = seenInSessionRef.current;
      const nextNotifications = [];

      snapshot.docs.forEach((docItem) => {
        const project = docItem.data();
        const projectDocId = docItem.id;
        const projectLabel = project.projectName || project.projectId || projectDocId;
        const status = String(project.status || "").toLowerCase();
        const updatedMarker =
          getMarker(project.updatedAt) ||
          getMarker(project.confirmedAt) ||
          getMarker(project.lastUpdated) ||
          "na";
        const isForwardedToManager = status.startsWith("passed and forwarded to ");
        const isReturnedToLead = status.startsWith("pending confirmation");
        const forwardedSignature = `${projectDocId}|${status}|${updatedMarker}`;
        const returnedSignature = `${projectDocId}|${status}|${updatedMarker}|${project.returnNote || ""}`;

        if (isReturnedToLead && !seen.returned.includes(returnedSignature)) {
          nextNotifications.push({
            key: `returned-${projectDocId}`,
            title: "Returned To Lead Review",
            message: `Project ${projectLabel} was returned and is no longer in manager approval queue.`,
            tone: "returned",
          });
          seen.returned.push(returnedSignature);
          return;
        }

        if (isForwardedToManager && !seen.forwarded.includes(forwardedSignature)) {
          nextNotifications.push({
            key: `forwarded-${projectDocId}`,
            title: "New Approval Request",
            message: `Project ${projectLabel} has been passed and forwarded for your approval.`,
            tone: "new",
          });
          seen.forwarded.push(forwardedSignature);
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
      label: "Approval Queue",
      value: loading ? "..." : inspectionCount.toString(),
      icon: <ClipboardList className="text-orange-500" size={16} />,
      trend: "Projects currently flowing through manager-side approval",
    },
    {
      label: "Inspection Templates",
      value: loading ? "..." : reportCount.toString(),
      icon: <ShieldCheck className="text-orange-500" size={16} />,
      trend: "Report types available across managed inspections",
    },
    {
      label: "System Users",
      value: loading ? "..." : userCount.toString(),
      icon: <User className="text-orange-500" size={16} />,
      trend: "Collaborators participating in review and approval workflows",
    },
    {
      label: "Equipment Registry",
      value: loading ? "..." : equipmentCount.toString(),
      icon: <Boxes className="text-orange-500" size={16} />,
      trend: "Managed assets connected to active project operations",
    },
  ];

  const quickActions = [
    {
      title: "Open approvals",
      description: "Review forwarded projects and act on manager approval requests immediately.",
      onClick: () => navigate("/Pending_approval"),
    },
    {
      title: "Review managed projects",
      description: "Track project status, inspection progress, and approval movement in one place.",
      onClick: () => navigate("/manager/projects"),
    },
    {
      title: "Monitor activity",
      description: "Follow manager-side workflow updates and recent approval-related activity.",
      onClick: () => navigate("/manager/projects"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <ManagerNavbar />
      <div className="flex min-h-screen flex-1">
        <ManagerSidebar />

        <main className="flex-1 ml-16 lg:ml-64 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(180deg,_#070c19_0%,_#090f1d_100%)] px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl space-y-7">
            <header className="rounded-[2rem] border border-slate-800/90 bg-[linear-gradient(135deg,rgba(12,18,36,0.98),rgba(35,22,24,0.94))] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-slate-500">
                    Control Center
                  </p>
                  <h1 className="text-3xl font-black tracking-tight text-white lg:text-5xl">
                    Manager Visibility
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-400 lg:text-base">
                    Track approvals, managed projects, system participation, and operational
                    activity from one manager command surface.
                  </p>
                  <p className="text-sm text-slate-500">
                    Signed in as{" "}
                    <span className="font-semibold text-orange-400">
                      {fullName || "Manager"}
                    </span>
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/40 bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-700"
                  onClick={() => navigate("/Pending_approval")}
                  title="Open approvals"
                  aria-label="Open approvals"
                >
                  <Activity size={18} />
                  Open Approvals
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.6rem] border border-slate-800 bg-[#0a1122] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition hover:border-slate-700"
                >
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
                      {stat.icon}
                    </div>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200/80">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-5xl font-black leading-none text-white">
                    {stat.value}
                  </p>
                  <p className="mt-4 max-w-[16rem] text-sm leading-7 text-slate-400">
                    {stat.trend}
                  </p>
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
                      Latest Manager Workflow Updates
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate("/manager/projects")}
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
                              Manager-side approval activity has been updated.
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
                  <div className="mb-5 flex items-center gap-3">
                    <Activity size={18} className="text-orange-500" />
                    <h2 className="text-lg font-bold text-white">Approval Chatbox</h2>
                  </div>
                  <ProjectChatbox
                    user={user}
                    assignmentField="managerId"
                    title=""
                    description=""
                    emptyStateLabel="No approval projects are available for chat yet."
                  />
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
                  navigate("/Pending_approval");
                }}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Open Approvals
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

export default ManagerDashboard;
