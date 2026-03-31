import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  Inbox,
  MessageSquareText,
  Search,
  ShieldAlert,
  Trash2,
  CheckCheck,
  Clock3,
  Eye,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../../utils/toast";
import { db } from "../../../Auth/firebase";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { useConfirmDialog } from "../../../Common/ConfirmDialog";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleString();
};

const ExternalFeedbackManager = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    const feedbackRef = query(
      collection(db, "external_feedback"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(feedbackRef, (snapshot) => {
      setItems(
        snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        })),
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const term = searchTerm.trim().toLowerCase();
        const matchesTerm =
          !term ||
          String(item.projectName || "").toLowerCase().includes(term) ||
          String(item.projectId || "").toLowerCase().includes(term) ||
          String(item.clientName || "").toLowerCase().includes(term) ||
          String(item.externalReviewerName || "").toLowerCase().includes(term) ||
          String(item.subject || "").toLowerCase().includes(term);

        const matchesStatus =
          statusFilter === "All" || String(item.status || "New") === statusFilter;

        return matchesTerm && matchesStatus;
      }),
    [items, searchTerm, statusFilter],
  );

  const selectedItem = useMemo(
    () =>
      filteredItems.find((item) => item.id === selectedId) || null,
    [filteredItems, selectedId],
  );

  useEffect(() => {
    if (!selectedItem) {
      setSelectedId("");
    }
  }, [selectedItem]);

  const updateStatus = async (item, nextStatus) => {
    setUpdatingId(item.id);
    try {
      await updateDoc(doc(db, "external_feedback", item.id), {
        status: nextStatus,
        adminUpdatedAt: serverTimestamp(),
      });
      toast.success(`Feedback marked as ${nextStatus}.`);
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the feedback."));
    } finally {
      setUpdatingId("");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = await openConfirm({
      title: "Delete Feedback",
      message: `Delete feedback "${item.subject || item.projectName || item.projectId}" permanently?`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!confirmed) return;

    setUpdatingId(item.id);
    try {
      await deleteDoc(doc(db, "external_feedback", item.id));
      toast.success("Feedback deleted.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to delete the feedback."));
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      {ConfirmDialog}
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold uppercase tracking-tighter text-white">
                  <MessageSquareText className="text-orange-500" /> External Feedback
                </h1>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  Admin Review Desk
                </p>
              </div>

              <div className="flex w-full flex-col gap-4 md:flex-row xl:w-auto">
                <div className="relative w-full md:w-80 group">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search by project, client, reviewer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-4 pl-12 text-xs outline-none transition-all focus:border-orange-500 shadow-inner backdrop-blur-md"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 text-xs font-bold uppercase tracking-[0.18em] text-white outline-none transition-all focus:border-orange-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="In Review">In Review</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="rounded-[2.5rem] border border-slate-800 bg-slate-900/30 px-8 py-24 text-center text-sm text-slate-500">
                Loading external feedback...
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="space-y-6">
                <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/40 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
                    <Inbox size={18} className="text-orange-400" />
                    <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-white">
                      Submission Queue
                    </h2>
                  </div>
                  <div className="max-h-[32rem] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-950/95 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 backdrop-blur">
                        <tr>
                          <th className="px-4 py-4">S/N</th>
                          <th className="px-4 py-4">Subject</th>
                          <th className="px-4 py-4">Project</th>
                          <th className="px-4 py-4">Client</th>
                          <th className="px-4 py-4">Reviewer</th>
                          <th className="px-4 py-4">Status</th>
                          <th className="px-4 py-4">Submitted</th>
                          <th className="px-4 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item, index) => {
                          const messagePreview = String(item.message || "");

                          return (
                            <tr
                              key={item.id}
                              className="border-t border-slate-800/80 transition hover:bg-slate-950/60"
                            >
                              <td className="px-4 py-4 text-slate-400">{index + 1}</td>
                              <td className="px-4 py-4">
                                <div className="font-semibold text-white">
                                  {item.subject || "Untitled Feedback"}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {messagePreview
                                    ? `${messagePreview.slice(0, 72)}${messagePreview.length > 72 ? "..." : ""}`
                                    : "No message provided."}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {item.projectName || item.projectId || "N/A"}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {item.clientName || "N/A"}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                <div>{item.externalReviewerName || "External Reviewer"}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {item.externalReviewerEmail || "No email"}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge status={item.status || "New"} />
                              </td>
                              <td className="px-4 py-4 text-slate-400">
                                {formatDateTime(item.createdAt)}
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedId(item.id)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-300 transition hover:bg-orange-500/20"
                                >
                                  <Eye size={14} />
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-800 bg-slate-900/10 py-32">
                <ShieldAlert size={48} className="mb-4 text-slate-800" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  No External Feedback Found
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">
                  Feedback Detail
                </p>
                <h2 className="mt-3 text-2xl font-bold text-white">
                  {selectedItem.subject || "Untitled Feedback"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Submitted by {selectedItem.externalReviewerName || "External Reviewer"} ({selectedItem.externalReviewerEmail || "No email"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId("")}
                className="rounded-xl border border-slate-700 bg-slate-950/70 p-2 text-slate-400 transition hover:border-slate-600 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock3 size={14} className="text-orange-400" />
                    <span className="font-bold uppercase tracking-[0.18em]">
                      Submitted
                    </span>
                  </div>
                  <p className="mt-2 text-slate-300">
                    {formatDateTime(selectedItem.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <InfoCard label="Project" value={selectedItem.projectName || selectedItem.projectId || "N/A"} />
                <InfoCard label="Client" value={selectedItem.clientName || "N/A"} />
                <InfoCard label="Status" value={selectedItem.status || "New"} />
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">
                  Message
                </p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {selectedItem.message || "No message provided."}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updateStatus(selectedItem, "In Review")}
                  disabled={updatingId === selectedItem.id}
                  className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  Mark In Review
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(selectedItem, "Resolved")}
                  disabled={updatingId === selectedItem.id}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <CheckCheck size={14} />
                  Mark Resolved
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedItem)}
                  disabled={updatingId === selectedItem.id}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const InfoCard = ({ label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-sm text-slate-200">{value}</p>
  </div>
);

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
      status === "Resolved"
        ? "bg-emerald-500/10 text-emerald-300"
        : status === "In Review"
          ? "bg-amber-500/10 text-amber-300"
          : "bg-orange-500/10 text-orange-300"
    }`}
  >
    {status}
  </span>
);

export default ExternalFeedbackManager;
