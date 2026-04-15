import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Flag,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../Auth/firebase";
import { useAuth } from "../Auth/AuthContext";
import SuperAdminShell from "../Dashboards/SuperAdminShell";

ChartJS.register(ArcElement, Legend, Tooltip);

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usersData, setUsersData] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [issueLogs, setIssueLogs] = useState([]);
  const [systemConfig, setSystemConfig] = useState({});
  const [featureFlags, setFeatureFlags] = useState({});

  useEffect(
    () =>
      onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          setUsersData(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        },
        (error) => {
          console.error("users listener error:", error);
        },
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        collection(db, "projects"),
        (snapshot) => {
          setProjectsData(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        },
        (error) => {
          console.error("projects listener error:", error);
        },
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        collection(db, "equipment"),
        (snapshot) => {
          setEquipmentCount(snapshot.size);
        },
        (error) => {
          console.error("equipment listener error:", error);
        },
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        collection(db, "issue_logs"),
        (snapshot) => {
          setIssueLogs(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        },
        (error) => {
          console.error("issue_logs listener error:", error);
        },
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        doc(db, "system_config", "platform"),
        (snapshot) => {
          setSystemConfig(snapshot.data() || {});
        },
        (error) => {
          console.error("system_config listener error:", error);
        },
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        doc(db, "feature_flags", "platform"),
        (snapshot) => {
          setFeatureFlags(snapshot.data() || {});
        },
        (error) => {
          console.error("feature_flags listener error:", error);
        },
      ),
    [],
  );

  const elevatedUsers = useMemo(
    () => usersData.filter((entry) => ["Admin", "Super_Admin"].includes(String(entry.role || ""))),
    [usersData],
  );
  const openIssues = issueLogs.filter(
    (entry) => !String(entry.status || "").toLowerCase().includes("resolved"),
  ).length;
  const unverifiedUsers = useMemo(
    () =>
      usersData.filter(
        (entry) =>
          !entry.emailVerified &&
          !["Admin", "Super_Admin"].includes(String(entry.role || "")),
      ).length,
    [usersData],
  );

  const stats = [
    {
      label: "Platform Users",
      value: String(usersData.length),
      accent: "#f97316",
      remainder: Math.max(usersData.length - elevatedUsers.length, 1),
      icon: <Users size={16} className="text-orange-400" />,
      detail: "Accounts currently registered across the platform.",
    },
    {
      label: "Elevated Access",
      value: String(elevatedUsers.length),
      accent: "#38bdf8",
      remainder: Math.max(usersData.length - elevatedUsers.length, 1),
      icon: <ShieldCheck size={16} className="text-orange-400" />,
      detail: "Admin and Super Admin accounts with governance access.",
    },
    {
      label: "Open Issues",
      value: String(openIssues),
      accent: "#f43f5e",
      remainder: Math.max(issueLogs.length - openIssues, 1),
      icon: <TriangleAlert size={16} className="text-orange-400" />,
      detail: "Support items that still need intervention or triage.",
    },
    {
      label: "Active Assets",
      value: String(equipmentCount),
      accent: "#10b981",
      remainder: Math.max(projectsData.length, 1),
      icon: <Boxes size={16} className="text-orange-400" />,
      detail: "Equipment records currently maintained in the system.",
    },
  ];

  const platformSignals = [
    { label: "Maintenance mode", value: systemConfig.maintenanceMode ? "Enabled" : "Disabled" },
    { label: "Self sign-up", value: systemConfig.allowSelfSignup ? "Allowed" : "Restricted" },
    {
      label: "Notifications",
      value: featureFlags.notificationsEnabled === false ? "Paused" : "Enabled",
    },
    { label: "Unverified users", value: String(unverifiedUsers) },
  ];

  const quickActions = [
    {
      title: "Open access control",
      description: "Review elevated accounts, role assignments, and platform owner coverage.",
      onClick: () => navigate("/super-admin/access"),
    },
    {
      title: "Tune platform settings",
      description: "Manage maintenance mode, support contacts, and feature toggles.",
      onClick: () => navigate("/super-admin/system"),
    },
    {
      title: "Inspect audit console",
      description: "Watch the latest operational and support activity across the app.",
      onClick: () => navigate("/super-admin/audit"),
    },
  ];

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-800 bg-[#0a1122] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-slate-500">
                Platform Governance
              </p>
              <h1 className="text-3xl font-black tracking-tight text-white lg:text-5xl">
                Super Admin Portal
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-400 lg:text-base">
                Maintain system access, platform controls, audit visibility, and operational safety
                from a dedicated governance workspace.
              </p>
              <p className="text-sm text-slate-500">
                Signed in as <span className="font-semibold text-orange-400">{user?.email}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/super-admin/system")}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/40 bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-700"
            >
              <Flag size={18} />
              Open Platform Controls
            </button>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-h-[220px] flex-col rounded-[1.6rem] border border-slate-800 bg-[#0a1122] px-6 py-6">
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
                  {stat.icon}
                </div>
              </div>
              <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-5">
                <div className="flex min-w-0 flex-col justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200/80">
                    {stat.label}
                  </p>
                  <p className="mt-4 max-w-[15rem] text-sm leading-7 text-slate-400">
                    {stat.detail}
                  </p>
                </div>
                <div className="relative h-24 w-24 rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-3">
                  <Doughnut
                    data={{
                      labels: [stat.label, "Remainder"],
                      datasets: [
                        {
                          data: [Number(stat.value), stat.remainder],
                          backgroundColor: [stat.accent, "rgba(148,163,184,0.16)"],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "72%",
                      plugins: { legend: { display: false } },
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-black text-white">
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
              Quick Actions
            </p>
            <div className="mt-6 space-y-4">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  type="button"
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
              Platform Signals
            </p>
            <div className="mt-6 space-y-4">
              {platformSignals.map((signal) => (
                <div key={signal.label} className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {signal.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">{signal.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
};

export default SuperAdminDashboard;
