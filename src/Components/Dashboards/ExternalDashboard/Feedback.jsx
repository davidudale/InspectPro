import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import {
  Briefcase,
  MessageSquareText,
  Search,
  ShieldAlert,
  Clock3,
  Send,
} from "lucide-react";
import { toast } from "react-toastify";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import ExternalNavbar from "./ExternalNavbar";
import ExternalSideBar from "./ExternalSideBar";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleString();
};

const Feedback = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedbackForms, setFeedbackForms] = useState({});
  const [submittingProjectId, setSubmittingProjectId] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const approvedProjectsRef = query(
      collection(db, "projects"),
      where("externalReviewerId", "==", user.uid),
      where("status", "==", "Approved"),
    );

    const unsubscribe = onSnapshot(approvedProjectsRef, (snapshot) => {
      const nextProjects = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setProjects(nextProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          String(project.projectName || "").toLowerCase().includes(term) ||
          String(project.projectId || "").toLowerCase().includes(term) ||
          String(project.clientName || project.client || "")
            .toLowerCase()
            .includes(term)
        );
      }),
    [projects, searchTerm],
  );

  const handleFormChange = (projectId, field, value) => {
    setFeedbackForms((prev) => ({
      ...prev,
      [projectId]: {
        subject: prev[projectId]?.subject || "",
        message: prev[projectId]?.message || "",
        [field]: value,
      },
    }));
  };

  const handleSubmitFeedback = async (project) => {
    const projectKey = project.id;
    const form = feedbackForms[projectKey] || { subject: "", message: "" };
    const subject = String(form.subject || "").trim();
    const message = String(form.message || "").trim();

    if (!subject || !message || !user?.uid) {
      toast.error("Please enter both subject and message.");
      return;
    }

    setSubmittingProjectId(projectKey);
    try {
      await addDoc(collection(db, "external_feedback"), {
        projectDocId: project.id,
        projectId: project.projectId || "",
        projectName: project.projectName || "",
        clientName: project.clientName || project.client || "",
        externalReviewerId: user.uid,
        externalReviewerName:
          user.fullName || user.name || user.displayName || user.email || "External Reviewer",
        externalReviewerEmail: user.email || "",
        adminRecipient: "Admin",
        subject,
        message,
        status: "New",
        createdAt: serverTimestamp(),
      });

      setFeedbackForms((prev) => ({
        ...prev,
        [projectKey]: { subject: "", message: "" },
      }));
      toast.success("Feedback sent to admin.");
    } catch (error) {
      toast.error(`Failed to send feedback: ${error.message}`);
    } finally {
      setSubmittingProjectId("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <ExternalNavbar />
      <div className="flex flex-1">
        <ExternalSideBar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                  <MessageSquareText className="text-orange-500" /> Feedback Desk
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  Approved Projects Only
                </p>
              </div>

              <div className="relative w-full xl:w-80 group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by ID, Client, or Project Name..."
                  className="w-full bg-slate-900/50 border border-slate-800 p-4 pl-12 rounded-2xl text-xs focus:border-orange-500 outline-none transition-all shadow-inner backdrop-blur-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-[2.5rem] border border-slate-800 bg-slate-900/30 px-8 py-24 text-center text-sm text-slate-500">
                Loading approved projects...
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid gap-6">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-orange-500">
                            <Briefcase size={18} />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-white">
                              {project.projectName || "Unnamed Project"}
                            </h2>
                            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500">
                              {project.projectId || project.id}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                            <p className="font-bold uppercase tracking-[0.18em] text-slate-500">
                              Client
                            </p>
                            <p className="mt-2 text-slate-200">
                              {project.clientName || project.client || "N/A"}
                            </p>
                          </div>
                          
                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                            <p className="font-bold uppercase tracking-[0.18em] text-slate-500">
                              Approved At
                            </p>
                            <p className="mt-2 text-slate-200">
                              {formatDateTime(
                                project.approvedAt ||
                                  project.confirmedAt ||
                                  project.updatedAt,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Clock3 size={14} className="text-orange-400" />
                          <span className="font-bold uppercase tracking-[0.18em]">
                            Review Timeline
                          </span>
                        </div>
                        <p className="mt-2 text-slate-300">
                          Returned: {formatDateTime(project.returnedAt)}
                        </p>
                        <p className="mt-1 text-slate-300">
                          Confirmed: {formatDateTime(project.confirmedAt)}
                        </p>
                      </div>
                    </div>

                    

                    <div className="mt-6 rounded-[1.75rem] border border-orange-500/20 bg-slate-950/80 p-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-orange-400">
                          <MessageSquareText size={18} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">
                            Send Feedback to Admin
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            Share a project-specific comment, issue, or recommendation with admin.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4">
                        <div className="grid gap-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={feedbackForms[project.id]?.subject || ""}
                            onChange={(e) =>
                              handleFormChange(project.id, "subject", e.target.value)
                            }
                            placeholder="Enter feedback subject"
                            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                          />
                        </div>

                        <div className="grid gap-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                            Message
                          </label>
                          <textarea
                            rows={5}
                            value={feedbackForms[project.id]?.message || ""}
                            onChange={(e) =>
                              handleFormChange(project.id, "message", e.target.value)
                            }
                            placeholder="Write your project feedback to admin..."
                            className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSubmitFeedback(project)}
                            disabled={submittingProjectId === project.id}
                            className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-700"
                          >
                            <Send size={16} />
                            {submittingProjectId === project.id ? "Sending..." : "Send to Admin"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
                <ShieldAlert size={48} className="text-slate-800 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
                  No Approved Project Feedback Found
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Feedback;
