import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Boxes,
  ClipboardList,
  Clock,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import AdminNavbar from "../Dashboards/AdminNavbar";
import AdminSidebar from "../Dashboards/AdminSidebar";
import { db, auth } from "../Auth/firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  orderBy,
  limit,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import ProjectChatbox from "../Common/ProjectChatbox";
import { useAuth } from "../Auth/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setUserCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "activity_logs"),
      orderBy("timestamp", "desc"),
      limit(10),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    const reportRef = query(
      collection(db, "projects"),
      where("status", "==", "Approved"),
    );
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
          setFullName(docSnap.data().fullName || docSnap.data().name || "Admin");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  const stats = [
    {
      label: "Active Inspections",
      value: loading ? "..." : inspectionCount.toString(),
      icon: <ClipboardList className="text-orange-500" size={16} />,
      trend: "Projects currently moving through the inspection workflow",
    },
    {
      label: "Reports Under Management",
      value: loading ? "..." : reportCount.toString(),
      icon: <ShieldCheck className="text-orange-500" size={16} />,
      trend: "Approved reports tracked across the platform",
    },
    {
      label: "System Users",
      value: loading ? "..." : userCount.toString(),
      icon: <User className="text-orange-500" size={16} />,
      trend: "Live personnel and role assignments",
    },
    {
      label: "Equipment Registry",
      value: loading ? "..." : equipmentCount.toString(),
      icon: <Boxes className="text-orange-500" size={16} />,
      trend: "Assets currently under lifecycle management",
    },
  ];

  const quickActions = [
    {
      title: "Create project",
      description: "Deploy a new inspection project and assign it to the field team.",
      onClick: () => navigate("/projects"),
    },
    {
      title: "Manage users",
      description: "Review system access, role assignments, and active team members.",
      onClick: () => navigate("/admin/users"),
    },
    {
      title: "Review activity",
      description: "Monitor current inspection movements and recent system updates.",
      onClick: () => navigate("/admin/projects"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex min-h-screen flex-1">
        <AdminSidebar />

        <main className="flex-1 ml-16 lg:ml-64 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(180deg,_#070c19_0%,_#090f1d_100%)] px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl space-y-7">
            <header className="rounded-[2rem] border border-slate-800/90 bg-[linear-gradient(135deg,rgba(12,18,36,0.98),rgba(35,22,24,0.94))] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-slate-500">
                    Control Center
                  </p>
                  <h1 className="text-3xl font-black tracking-tight text-white lg:text-5xl">
                    Admin Visibility
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-400 lg:text-base">
                    Track inspections, users, reports, and operational activity from one
                    executive command surface.
                  </p>
                  <p className="text-sm text-slate-500">
                    Signed in as{" "}
                    <span className="font-semibold text-orange-400">
                      {fullName || "Admin"}
                    </span>
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/40 bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 shadow-lg shadow-orange-950/20"
                  onClick={() => navigate("/projects")}
                  title="Create project"
                  aria-label="Create project"
                >
                  <PlusCircle size={18} />
                  Create Project
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
                      Latest System And Project Updates
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate("/admin/projects")}
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
                              Administrative workflow activity has been updated.
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
                      <p className="text-sm text-slate-400">
                        No recent activity detected.
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

                <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
                  <div className="mb-5 flex items-center gap-3">
                    <Activity size={18} className="text-orange-500" />
                    <h2 className="text-lg font-bold text-white">Project Chatbox</h2>
                  </div>
                  <ProjectChatbox
                    user={user}
                    title=""
                    description=""
                    emptyStateLabel="No project threads are available yet."
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
