import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, FileSearch, PackageSearch } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import InternalReviewerShell from "./InternalReviewerShell";

const InternalReviewerDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      setProjects(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "issue_logs"), (snapshot) => {
      setIssues(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });
    return () => unsubscribe();
  }, []);

  const metrics = useMemo(() => {
    const equipmentCount = new Set(
      projects
        .map((project) => project.equipmentId || project.equipmentTag || project.tag)
        .filter(Boolean),
    ).size;
    const openIssues = issues.filter(
      (issue) => !["resolved", "closed"].includes(String(issue.status || "").toLowerCase()),
    ).length;

    return [
      { label: "Visible Projects", value: projects.length, icon: <FileSearch size={20} /> },
      { label: "Internal Reviews", value: "Ready", icon: <ClipboardCheck size={20} /> },
      { label: "Open Issues", value: openIssues, icon: <AlertTriangle size={20} /> },
      { label: "Equipment Scope", value: equipmentCount, icon: <PackageSearch size={20} /> },
    ];
  }, [issues, projects]);

  const displayName =
    user?.fullName || user?.name || user?.displayName || user?.email || "Internal Reviewer";

  return (
    <InternalReviewerShell>
      <div className="mx-auto max-w-7xl">
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-orange-400">
          Internal Reviewer Workspace
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">
          Welcome, {displayName}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Review all projects, capture internal observations, and track project issues from
          one workspace.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
                  {metric.icon}
                </div>
                <span className="text-2xl font-black text-white">{metric.value}</span>
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </InternalReviewerShell>
  );
};

export default InternalReviewerDashboard;
