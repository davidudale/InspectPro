import React, { useEffect, useMemo, useState } from "react";
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
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import AdminNavbar from "../Dashboards/AdminNavbar";
import AdminSidebar from "../Dashboards/AdminSidebar";
import { db, auth, rtdb } from "../Auth/firebase";
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
import { onValue, ref as rtdbRef } from "firebase/database";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [usersData, setUsersData] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [fullName, setFullName] = useState("");
  const [onlineUserCount, setOnlineUserCount] = useState(0);

  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setUsersData(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
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
      setProjectsData(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
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
    const unsubscribe = onValue(rtdbRef(rtdb, "status"), (snapshot) => {
      const statuses = snapshot.val() || {};
      const nextCount = Object.values(statuses).filter(
        (entry) => String(entry?.state || "").toLowerCase() === "online",
      ).length;
      setOnlineUserCount(nextCount);
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
  const projectStatusSummary = useMemo(() => {
    const counts = projectsData.reduce((acc, project) => {
      const rawStatus = String(project?.status || "").trim().toLowerCase();
      const bucket = rawStatus === "approved"
        ? "Approved"
        : rawStatus.includes("return") || rawStatus.includes("reject")
          ? "Returned"
          : rawStatus.startsWith("in progress")
            ? "In Progress"
            : rawStatus.startsWith("not started") || rawStatus === "planned"
              ? "Planned"
              : "Other";
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {});

    return [
      { label: "Approved", value: counts.Approved || 0, color: "#10b981" },
      { label: "In Progress", value: counts["In Progress"] || 0, color: "#f97316" },
      { label: "Returned", value: counts.Returned || 0, color: "#f43f5e" },
      { label: "Planned", value: counts.Planned || 0, color: "#38bdf8" },
      { label: "Other", value: counts.Other || 0, color: "#64748b" },
    ];
  }, [projectsData]);
  const deploymentTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("en-US", { month: "short" }),
        value: 0,
      };
    });

    projectsData.forEach((project) => {
      const source =
        project?.deploymentDate?.toDate?.() ||
        project?.createdAt?.toDate?.() ||
        (project?.startDate ? new Date(project.startDate) : null);
      if (!source || Number.isNaN(source.getTime())) return;
      const key = `${source.getFullYear()}-${source.getMonth()}`;
      const monthEntry = months.find((item) => item.key === key);
      if (monthEntry) monthEntry.value += 1;
    });

    return months;
  }, [projectsData]);
  const userRoleSummary = useMemo(() => {
    const counts = usersData.reduce((acc, entry) => {
      const role = String(entry?.role || "Unknown").trim() || "Unknown";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [usersData]);
  const stats = [
    {
      label: "Active Inspections",
      value: loading ? "..." : inspectionCount.toString(),
      trend: "Projects currently moving through the inspection workflow",
      icon: <ClipboardList className="text-orange-500" size={16} />,
    },
    {
      label: "Reports Under Management",
      value: loading ? "..." : reportCount.toString(),
      trend: "Approved reports tracked across the platform",
      icon: <ShieldCheck className="text-orange-500" size={16} />,
    },
    {
      label: "System Users",
      value: loading ? "..." : userCount.toString(),
      trend: loading
        ? "Live personnel and role assignments"
        : `${onlineUserCount} user${onlineUserCount === 1 ? "" : "s"} online now`,
      icon: <User className="text-orange-500" size={16} />,
    },
    {
      label: "Equipment Registry",
      value: loading ? "..." : equipmentCount.toString(),
      trend: "Assets currently under lifecycle management",
      icon: <Boxes className="text-orange-500" size={16} />,
    },
  ];
  const chartBaseOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
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
  const compactChartOptions = useMemo(
    () => ({
      ...chartBaseOptions,
      scales: {
        x: { display: false, grid: { display: false }, ticks: { display: false } },
        y: { display: false, grid: { display: false }, ticks: { display: false } },
      },
    }),
    [chartBaseOptions],
  );
  const doughnutOptions = useMemo(
    () => ({
      ...chartBaseOptions,
      cutout: "72%",
    }),
    [chartBaseOptions],
  );
  const statCardCharts = useMemo(
    () => [
      {
        type: "doughnut",
        data: {
          labels: ["Active Inspections", "Remaining"],
          datasets: [
            {
              data: [inspectionCount, Math.max(reportCount + equipmentCount, 1)],
              backgroundColor: ["#f97316", "rgba(148,163,184,0.16)"],
              borderWidth: 0,
            },
          ],
        },
      },
      {
        type: "doughnut",
        data: {
          labels: ["Approved Reports", "Other Projects"],
          datasets: [
            {
              data: [reportCount, Math.max(inspectionCount - reportCount, 1)],
              backgroundColor: ["#10b981", "rgba(148,163,184,0.16)"],
              borderWidth: 0,
            },
          ],
        },
      },
      {
        type: "doughnut",
        data: {
          labels: ["Users", "Capacity"],
          datasets: [
            {
              data: [userCount, Math.max(inspectionCount, 20)],
              backgroundColor: ["#38bdf8", "rgba(148,163,184,0.16)"],
              borderWidth: 0,
            },
          ],
        },
      },
      {
        type: "doughnut",
        data: {
          labels: ["Equipment", "Remaining"],
          datasets: [
            {
              data: [equipmentCount, Math.max(userCount + reportCount, )],
              backgroundColor: ["#a855f7", "rgba(148,163,184,0.16)"],
              borderWidth: 0,
            },
          ],
        },
      },
    ],
    [equipmentCount, inspectionCount, reportCount, userCount],
  );

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
                      {statCardCharts[index]?.type === "doughnut" ? (
                        <Doughnut data={statCardCharts[index].data} options={doughnutOptions} />
                      ) : (
                        <Line data={statCardCharts[index].data} options={compactChartOptions} />
                      )}
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
                      Dashboard Charts
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-white">
                      Project And User Analytics
                    </h2>
                  </div>
                  <div className="space-y-6">
                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-white">Project Workflow Mix</p>
                          <p className="text-xs text-slate-500">
                            Real-time distribution of project outcomes
                          </p>
                        </div>
                        <Activity size={16} className="text-orange-500" />
                      </div>
                      <div className="h-56">
                        <Doughnut
                          data={{
                            labels: projectStatusSummary.map((item) => item.label),
                            datasets: [
                              {
                                data: projectStatusSummary.map((item) => item.value),
                                backgroundColor: projectStatusSummary.map((item) => item.color),
                                borderColor: "#020617",
                                borderWidth: 4,
                              },
                            ],
                          }}
                          options={doughnutOptions}
                        />
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-white">Deployments Last 6 Months</p>
                          <p className="text-xs text-slate-500">
                            Monthly trend of newly deployed projects
                          </p>
                        </div>
                        <RefreshCw size={16} className="text-orange-500" />
                      </div>
                      <div className="h-52">
                        <Bar
                          data={{
                            labels: deploymentTrend.map((item) => item.label),
                            datasets: [
                              {
                                label: "Deployments",
                                data: deploymentTrend.map((item) => item.value),
                                backgroundColor: [
                                  "#fb923c",
                                  "#f97316",
                                  "#ea580c",
                                  "#f59e0b",
                                  "#f97316",
                                  "#fb923c",
                                ],
                                borderRadius: 10,
                                borderSkipped: false,
                              },
                            ],
                          }}
                          options={{
                            ...chartBaseOptions,
                            scales: {
                              x: {
                                ticks: {
                                  color: "#94a3b8",
                                  font: { size: 10, weight: "700" },
                                },
                                grid: { display: false },
                                border: { display: false },
                              },
                              y: {
                                ticks: {
                                  color: "#64748b",
                                  precision: 0,
                                  font: { size: 10 },
                                },
                                grid: { color: "rgba(148,163,184,0.08)" },
                                border: { display: false },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-white">Top User Roles</p>
                          <p className="text-xs text-slate-500">
                            Snapshot of the largest role groups in the system
                          </p>
                        </div>
                        <User size={16} className="text-orange-500" />
                      </div>
                      <div className="h-52">
                        <Bar
                          data={{
                            labels: userRoleSummary.map((item) => item.label),
                            datasets: [
                              {
                                label: "Users",
                                data: userRoleSummary.map((item) => item.value),
                                backgroundColor: "#38bdf8",
                                borderRadius: 10,
                                borderSkipped: false,
                              },
                            ],
                          }}
                          options={{
                            indexAxis: "y",
                            ...chartBaseOptions,
                            scales: {
                              x: {
                                ticks: {
                                  color: "#64748b",
                                  precision: 0,
                                  font: { size: 10 },
                                },
                                grid: { color: "rgba(148,163,184,0.08)" },
                                border: { display: false },
                              },
                              y: {
                                ticks: {
                                  color: "#cbd5e1",
                                  font: { size: 10, weight: "700" },
                                },
                                grid: { display: false },
                                border: { display: false },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

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
    </div>
  );
};

export default AdminDashboard;
