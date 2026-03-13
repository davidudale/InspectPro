import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  FileWarning,
  Inbox,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import SupervisorNavbar from "../SupervisorFiles/SupervisorNavbar";
import SupervisorSidebar from "../SupervisorFiles/SupervisorSidebar";

const ExternalReviewer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setAssignedProjects([]);
      setLoading(false);
      return undefined;
    }

    const projectsQuery = query(
      collection(db, "projects"),
      where("supervisorId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const nextProjects = snapshot.docs.map((projectDoc) => ({
        id: projectDoc.id,
        ...projectDoc.data(),
      }));
      setAssignedProjects(nextProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const metrics = useMemo(() => {
    const pending = assignedProjects.filter((project) =>
      String(project.status || "").toLowerCase().startsWith("pending confirmation"),
    ).length;
    const returned = assignedProjects.filter((project) =>
      String(project.returnNote || "").trim(),
    ).length;
    const confirmed = assignedProjects.filter((project) =>
      String(project.status || "").toLowerCase().includes("passed") ||
      String(project.status || "").toLowerCase().includes("confirmed"),
    ).length;

    return {
      total: assignedProjects.length,
      pending,
      returned,
      confirmed,
    };
  }, [assignedProjects]);

  const recentProjects = useMemo(
    () =>
      [...assignedProjects]
        .sort((left, right) => {
          const leftMillis =
            left.updatedAt?.toMillis?.() ||
            left.createdAt?.toMillis?.() ||
            left.timestamp?.toMillis?.() ||
            0;
          const rightMillis =
            right.updatedAt?.toMillis?.() ||
            right.createdAt?.toMillis?.() ||
            right.timestamp?.toMillis?.() ||
            0;
          return rightMillis - leftMillis;
        })
        .slice(0, 6),
    [assignedProjects],
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <SupervisorSidebar />
      <div className="flex-1 ml-16 lg:ml-64">
        <SupervisorNavbar />
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/*<section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 lg:p-8 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-orange-400">
                  External Reviewer
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                  Review queue and approval workspace
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  Monitor assigned reviews, track returned items, and move projects through confirmation.
                </p>
              </div>
              <button
                onClick={() => navigate("/SubInspection_view")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:bg-orange-700"
              >
                Open Review Queue
                <ArrowRight size={16} />
              </button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Inbox size={18} />}
              label="Assigned Reviews"
              value={metrics.total}
              tone="slate"
            />
            <StatCard
              icon={<ClipboardCheck size={18} />}
              label="Pending Confirmation"
              value={metrics.pending}
              tone="orange"
            />
            <StatCard
              icon={<FileWarning size={18} />}
              label="Returned Items"
              value={metrics.returned}
              tone="red"
            />
            <StatCard
              icon={<BadgeCheck size={18} />}
              label="Confirmed Items"
              value={metrics.confirmed}
              tone="emerald"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Recent Assigned Reviews</h2>
                  <p className="text-sm text-slate-400">Latest projects routed to your review queue.</p>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-sm text-slate-500">Loading assignments...</div>
              ) : recentProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-16 text-center">
                  <AlertCircle className="mx-auto mb-3 text-slate-500" size={22} />
                  <p className="text-sm font-semibold text-slate-300">No reviews assigned yet.</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">
                    New assignments will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => navigate("/SubInspection_view")}
                      className="flex w-full items-start justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left transition hover:border-orange-500/40 hover:bg-slate-900"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">
                          {project.projectName || project.projectId || project.id}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                          {project.client || "Unassigned client"}
                        </p>
                        <p className="mt-3 text-sm text-slate-400">
                          {project.status || "Awaiting review"}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-slate-500">
                        {formatProjectAge(project)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white">Role Access</h2>
              <p className="mt-2 text-sm text-slate-400">
                This dashboard is shown only for users with the <span className="font-semibold text-orange-400">External_Reviewer</span> role.
              </p>

              <div className="mt-6 space-y-3">
                <QuickAction
                  label="Pending inspections"
                  description="Review active items assigned to you."
                  onClick={() => navigate("/SubInspection_view")}
                />
                <QuickAction
                  label="Confirmed inspections"
                  description="Open already confirmed inspections."
                  onClick={() => navigate("/ConfirmedInspection")}
                />
                <QuickAction
                  label="Report review"
                  description="Continue confirmation and feedback workflows."
                  onClick={() => navigate("/review-for-confirmation")}
                />
              </div>
            </div>
          </section>*/}
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }) => {
  const toneClasses = {
    slate: "bg-slate-900/70 text-slate-300 border-slate-800",
    orange: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    red: "bg-red-500/10 text-red-300 border-red-500/20",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-lg ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="mb-4 inline-flex rounded-2xl bg-slate-950/50 p-3">{icon}</div>
      <p className="text-xs font-bold uppercase tracking-[0.25em]">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
};

const QuickAction = ({ label, description, onClick }) => (
  <button
    onClick={onClick}
    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left transition hover:border-orange-500/40 hover:bg-slate-900"
  >
    <p className="text-sm font-bold text-white">{label}</p>
    <p className="mt-1 text-sm text-slate-400">{description}</p>
  </button>
);

const formatProjectAge = (project) => {
  const source =
    project.updatedAt?.toDate?.() ||
    project.createdAt?.toDate?.() ||
    project.timestamp?.toDate?.();

  if (!source) return "No timestamp";

  return formatDistanceToNow(source, { addSuffix: true });
};

export default ExternalReviewer;
