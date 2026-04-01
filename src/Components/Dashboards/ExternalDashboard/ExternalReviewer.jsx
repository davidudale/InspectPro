import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ClipboardCheck,
  Clock,
  Eye,
  FileWarning,
  Inbox,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import ExternalSideBar from "./ExternalSideBar";
import ExternalNavbar from "./ExternalNavbar";
import { matchesExternalReviewerProject } from "../../../utils/externalReviewerAccess";

const ExternalReviewer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const reviewerName =
    user?.fullName || user?.name || user?.displayName || user?.email || "External Reviewer";
  const reviewerTypeLabel = user?.reviewerType
    ? String(user.reviewerType).replaceAll("_", " ")
    : "";

  useEffect(() => {
    if (!user?.uid) {
      setAssignedProjects([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      const nextProjects = snapshot.docs.map((projectDoc) => ({
        id: projectDoc.id,
        ...projectDoc.data(),
      }))
      .filter((project) => matchesExternalReviewerProject(project, user));
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
          : dominantClient?.name || "Client Workspace",
      logo: dominantClient?.logo || "",
    };
  }, [assignedProjects]);

  const quickActions = [
    {
      title: "Open review desk",
      description: "Jump into approved projects that are ready for external review.",
      onClick: () => navigate("/external-reviewer-projects"),
    },
    {
      title: "Send feedback",
      description: "Review completed work and submit comments back to the admin team.",
      onClick: () => navigate("/external-reviewer-feedback"),
    },
    {
      title: "Inspect equipment",
      description: "Open the equipment workspace linked to the projects assigned to you.",
      onClick: () => navigate("/external-reviewer-equipment"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <ExternalNavbar />
      <div className="flex min-h-screen flex-1">
        <ExternalSideBar />
        <main className="flex-1 ml-16 lg:ml-64 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(180deg,_#070c19_0%,_#090f1d_100%)] px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl space-y-7">
            <header className="rounded-[2rem] border border-slate-800/90 bg-[linear-gradient(135deg,rgba(12,18,36,0.98),rgba(35,22,24,0.94))] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
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
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-slate-500">
                      Control Center
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-white lg:text-5xl">
                      Reviewer Visibility
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-slate-400 lg:text-base">
                      Track assigned reviews, approved reports, and external feedback from one
                      reviewer command surface.
                    </p>
                    <p className="text-sm text-slate-500">
                      Signed in as{" "}
                      <span className="font-semibold text-orange-400">{reviewerName}</span>
                      {reviewerTypeLabel ? ` - ${reviewerTypeLabel}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/40 bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-700"
                  onClick={() => navigate("/external-reviewer-projects")}
                  title="Open review desk"
                  aria-label="Open review desk"
                >
                  <ClipboardCheck size={18} />
                  Open Review Desk
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<Inbox className="text-orange-500" size={16} />}
                label="Assigned Projects"
                value={loading ? "..." : metrics.total}
                description="Projects currently assigned into your external review workspace."
              />
              <MetricCard
                icon={<Eye className="text-orange-500" size={16} />}
                label="Approved Reports"
                value={loading ? "..." : metrics.viewedReports}
                description="Approved project reports available for independent review."
              />
              <MetricCard
                icon={<FileWarning className="text-orange-500" size={16} />}
                label="Awaiting Review"
                value={loading ? "..." : metrics.awaitingReview}
                description="Approved reports that still need your feedback or sign-off."
              />
              <MetricCard
                icon={<MessageSquareText className="text-orange-500" size={16} />}
                label="Feedback Provided"
                value={loading ? "..." : metrics.feedbackProvided}
                description="Review notes and response items already sent back to the team."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
              <div className="rounded-[1.8rem] border border-slate-800 bg-[#0a1122] p-6 lg:p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-slate-500">
                      Recent Assignments
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-white">
                      Latest Review Workspace Updates
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate("/external-reviewer-projects")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-500/50"
                  >
                    <RefreshCw size={14} />
                    View all
                  </button>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <p className="text-sm text-slate-400">Loading assignments...</p>
                    </div>
                  ) : recentProjects.length > 0 ? (
                    recentProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => navigate("/external-reviewer-projects")}
                        className="w-full rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5 text-left transition hover:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <p className="text-base font-semibold text-white">
                              {project.projectName || project.projectId || project.id}
                            </p>
                            <p className="text-sm text-slate-400">
                              {project.clientName || project.client || "Unassigned client"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {project.status || "Awaiting review"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            <div>{formatProjectAge(project)}</div>
                            <div className="mt-2 inline-flex items-center gap-2">
                              <Clock size={10} />
                              <span>review</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 text-slate-500" size={18} />
                        <div>
                          <p className="text-sm font-semibold text-slate-300">
                            No reviews assigned yet.
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            New external review assignments will appear here.
                          </p>
                        </div>
                      </div>
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
                    <ClipboardCheck size={18} className="text-orange-500" />
                    <h2 className="text-lg font-bold text-white">Reviewer Snapshot</h2>
                  </div>
                  <div className="space-y-4">
                    <SnapshotRow
                      label="Primary Client Workspace"
                      value={primaryClient.name || "Client Workspace"}
                    />
                    <SnapshotRow
                      label="Approved Reports Ready"
                      value={String(metrics.viewedReports)}
                    />
                    <SnapshotRow
                      label="Reviews Awaiting Feedback"
                      value={String(metrics.awaitingReview)}
                    />
                    <SnapshotRow
                      label="Feedback Entries Logged"
                      value={String(metrics.feedbackProvided)}
                    />
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

const MetricCard = ({ icon, label, value, description }) => (
  <div className="rounded-[1.6rem] border border-slate-800 bg-[#0a1122] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition hover:border-slate-700">
    <div className="mb-5 flex items-start justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
        {icon}
      </div>
    </div>
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200/80">{label}</p>
    <p className="mt-2 text-5xl font-black leading-none text-white">{value}</p>
    <p className="mt-4 max-w-[16rem] text-sm leading-7 text-slate-400">{description}</p>
  </div>
);

const SnapshotRow = ({ label, value }) => (
  <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 px-4 py-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-2 text-base font-semibold text-white">{value}</p>
  </div>
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
