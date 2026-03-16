import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ClipboardCheck,
  Eye,
  FileWarning,
  Inbox,
  MessageSquareText,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";

import ExternalSideBar from "./ExternalSideBar";
import ExternalNavbar from "./ExternalNavbar";

const ExternalReviewer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const reviewerName =
    user?.fullName || user?.name || user?.displayName || user?.email || "External Reviewer";

  useEffect(() => {
    if (!user?.uid) {
      setAssignedProjects([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const projectsQuery = query(
      collection(db, "projects"),
      where("externalReviewerId", "==", user.uid),
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

  useEffect(() => {
    if (!user?.uid) {
      setFeedbackEntries([]);
      return undefined;
    }

    const feedbackQuery = query(
      collection(db, "external_feedback"),
      where("externalReviewerId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const nextFeedback = snapshot.docs.map((feedbackDoc) => ({
        id: feedbackDoc.id,
        ...feedbackDoc.data(),
      }));
      setFeedbackEntries(nextFeedback);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const metrics = useMemo(() => {
    const viewedReports = assignedProjects.filter(
      (project) => String(project.status || "").trim().toLowerCase() === "approved",
    );
    const reviewedProjectIds = new Set(
      feedbackEntries
        .map((entry) => entry.projectDocId || entry.projectId || "")
        .filter(Boolean),
    );
    const awaitingReview = viewedReports.filter((project) => {
      const docId = String(project.id || "").trim();
      const projectId = String(project.projectId || "").trim();
      return !reviewedProjectIds.has(docId) && !reviewedProjectIds.has(projectId);
    }).length;

    return {
      total: assignedProjects.length,
      viewedReports: viewedReports.length,
      awaitingReview,
      feedbackProvided: feedbackEntries.length,
    };
  }, [assignedProjects, feedbackEntries]);

  const recentProjects = useMemo(
    () =>
      [...assignedProjects]
        .filter(
          (project) => String(project.status || "").trim().toLowerCase() === "approved",
        )
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

  const primaryClient = useMemo(() => {
    if (assignedProjects.length === 0) {
      return {
        name: "Client Workspace",
        logo: "",
      };
    }

    const clientSummaries = assignedProjects.reduce((accumulator, project) => {
      const name = String(project.clientName || project.client || "").trim();
      const logo = String(
        project.clientLogo || project.logo || project.client?.logo || "",
      ).trim();

      if (!name && !logo) {
        return accumulator;
      }

      const key = name || "Unnamed Client";
      const current = accumulator.get(key) || { count: 0, name: key, logo: "" };

      accumulator.set(key, {
        count: current.count + 1,
        name: current.name,
        logo: current.logo || logo,
      });

      return accumulator;
    }, new Map());

    const rankedClients = Array.from(clientSummaries.values()).sort(
      (left, right) => right.count - left.count,
    );
    const dominantClient = rankedClients[0];

    return {
      name:
        assignedProjects.length > 1 && rankedClients.length > 1
          ? `${dominantClient?.name || "Client"} +${rankedClients.length - 1} more`
          : dominantClient?.name ||
        "Client Workspace",
      logo:
        dominantClient?.logo ||
        "",
    };
  }, [assignedProjects]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <ExternalNavbar />
      <div className="flex flex-1 min-h-screen">
        <ExternalSideBar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <header className="flex justify-between items-end mb-8">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-white p-2 shadow-lg shadow-black/20">
                  {primaryClient.logo ? (
                    <img
                      src={primaryClient.logo}
                      alt={`${primaryClient.name} logo`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xl font-black uppercase tracking-[0.2em] text-orange-500">
                      {primaryClient.name.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    {primaryClient.name}
                  </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Welcome back,{" "}
                  <span className="text-orange-500 font-semibold">
                    {reviewerName}
                  </span>
                  .
                </p>
                </div>
              </div>
            </header>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-4">
            <StatCard
              icon={<Eye size={18} />}
              label="Total Reports"
              value={metrics.viewedReports}
              tone="slate"
            />
            <StatCard
              icon={<Eye size={18} />}
              label="Total Viewed Reports"
              value={metrics.viewedReports}
              tone="slate"
            />
            <StatCard
              icon={<ClipboardCheck size={18} />}
              label="Total Reports Awaiting Review"
              value={metrics.awaitingReview}
              tone="orange"
            />
            <StatCard
              icon={<MessageSquareText size={18} />}
              label="Total Feedback Provided"
              value={metrics.feedbackProvided}
              tone="emerald"
            />
             
           </section>
          {/*<section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Projects</h2>
                  <p className="text-sm text-slate-400">Project Listings.</p>
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
                          {project.clientName || project.client || "Unassigned client"}
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

            
          </section>*/}
         </div>
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

const formatProjectAge = (project) => {
  const source =
    project.updatedAt?.toDate?.() ||
    project.createdAt?.toDate?.() ||
    project.timestamp?.toDate?.();

  if (!source) return "No timestamp";

  return formatDistanceToNow(source, { addSuffix: true });
};

export default ExternalReviewer;
