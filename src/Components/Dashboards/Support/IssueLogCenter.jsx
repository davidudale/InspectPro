import React, { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Bug, CheckCheck, LifeBuoy, RefreshCcw, Save } from "lucide-react";
import { toast } from "react-toastify";
import { db } from "../../Auth/firebase";
import { useAuth } from "../../Auth/AuthContext";
import { useConfirmDialog } from "../../Common/ConfirmDialog";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";
import TableQueryControls from "../../Common/TableQueryControls";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import SupervisorNavbar from "../SupervisorFiles/SupervisorNavbar";
import SupervisorSidebar from "../SupervisorFiles/SupervisorSidebar";
import InspectorNavbar from "../InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../InspectorsFile/InspectorSidebar";
import ExternalNavbar from "../ExternalDashboard/ExternalNavbar";
import ExternalSideBar from "../ExternalDashboard/ExternalSideBar";
import { getToastErrorMessage } from "../../../utils/toast";

const MODULE_OPTIONS = [
  "Dashboard",
  "Project Management",
  "Report Manager",
  "Inspection Operations",
  "Equipment Management",
  "User Management",
  "Scheduling",
  "External Review",
  "Authentication & Access",
  "Support",
  "Other",
];

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved", "Closed", "Reopened"];

const resolveShell = (role) => {
  if (role === "Admin") {
    return { navbar: <AdminNavbar />, sidebar: <AdminSidebar /> };
  }
  if (role === "Manager") {
    return { navbar: <ManagerNavbar />, sidebar: <ManagerSidebar /> };
  }
  if (role === "Lead Inspector") {
    return { navbar: <SupervisorNavbar />, sidebar: <SupervisorSidebar /> };
  }
  if (role === "External_Reviewer" || role === "External Reviewer") {
    return { navbar: <ExternalNavbar />, sidebar: <ExternalSideBar /> };
  }
  return { navbar: <InspectorNavbar />, sidebar: <InspectorSidebar /> };
};

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  return 0;
};

const formatDateTime = (value) => {
  const millis = toMillis(value);
  if (!millis) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
};

const IssueLogCenter = () => {
  const { user } = useAuth();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const shell = useMemo(() => resolveShell(user?.role), [user?.role]);
  const isAdmin = user?.role === "Admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [formData, setFormData] = useState({
    module: MODULE_OPTIONS[0],
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusEdits, setStatusEdits] = useState({});
  const [updatingId, setUpdatingId] = useState("");

  React.useEffect(() => {
    const issuesQuery = query(collection(db, "issue_logs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      issuesQuery,
      (snapshot) => {
        const nextItems = snapshot.docs.map((issueDoc) => ({
          id: issueDoc.id,
          ...issueDoc.data(),
        }));
        setItems(nextItems);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const visibleItems = useMemo(() => {
    const ownId = String(user?.uid || "").trim();
    return isAdmin
      ? items
      : items.filter((item) => String(item.reportedById || "").trim() === ownId);
  }, [isAdmin, items, user?.uid]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return visibleItems.filter((item) => {
      const matchesTerm =
        !term ||
        String(item.description || "").toLowerCase().includes(term) ||
        String(item.module || "").toLowerCase().includes(term) ||
        String(item.reportedByName || "").toLowerCase().includes(term) ||
        String(item.reportedByEmail || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || String(item.status || "").toLowerCase() === statusFilter;
      const matchesModule =
        moduleFilter === "all" || String(item.module || "").toLowerCase() === moduleFilter;

      return matchesTerm && matchesStatus && matchesModule;
    });
  }, [moduleFilter, searchTerm, statusFilter, visibleItems]);

  const pendingResolutionConfirmation = useMemo(
    () =>
      visibleItems.filter(
        (item) =>
          String(item.status || "").trim().toLowerCase() === "resolved" &&
          !item.resolutionConfirmedAt,
      ),
    [visibleItems],
  );

  const handleSubmitIssue = async (event) => {
    event.preventDefault();
    const normalizedDescription = formData.description.trim();

    if (!normalizedDescription) {
      toast.error("Describe the issue before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "issue_logs"), {
        module: formData.module,
        description: normalizedDescription,
        status: "Open",
        reportedById: user?.uid || "",
        reportedByName:
          user?.fullName || user?.name || user?.displayName || user?.email || "Unknown User",
        reportedByEmail: user?.email || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        resolvedAt: null,
        resolvedById: "",
        resolvedByName: "",
        resolutionConfirmedAt: null,
        resolutionConfirmedById: "",
        reopenedAt: null,
      });

      setFormData({
        module: MODULE_OPTIONS[0],
        description: "",
      });
      toast.success("Issue logged successfully.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to log the issue."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminStatusUpdate = async (item) => {
    const nextStatus = statusEdits[item.id] || item.status || "Open";
    if (nextStatus === item.status) return;

    const confirmed = await openConfirm({
      title: "Update Issue Status",
      message: `Change this issue from ${item.status || "Open"} to ${nextStatus}?`,
      confirmLabel: "Update Status",
      cancelLabel: "Cancel",
      tone: nextStatus === "Resolved" ? "success" : "info",
    });

    if (!confirmed) return;

    setUpdatingId(item.id);
    try {
      const payload = {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      };

      if (nextStatus === "Resolved") {
        payload.resolvedAt = serverTimestamp();
        payload.resolvedById = user?.uid || "";
        payload.resolvedByName =
          user?.fullName || user?.name || user?.displayName || user?.email || "Admin";
        payload.resolutionConfirmedAt = null;
        payload.resolutionConfirmedById = "";
      }

      await updateDoc(doc(db, "issue_logs", item.id), payload);
      toast.success(`Issue marked as ${nextStatus}.`);
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the issue status."));
    } finally {
      setUpdatingId("");
    }
  };

  const handleUserResolutionAction = async (item, action) => {
    const isClosing = action === "close";
    const confirmed = await openConfirm({
      title: isClosing ? "Confirm Resolution" : "Reopen Issue",
      message: isClosing
        ? "Confirm that this issue has been resolved successfully."
        : "This will reopen the issue and notify support that you still need help.",
      confirmLabel: isClosing ? "Mark Closed" : "Reopen Issue",
      cancelLabel: "Cancel",
      tone: isClosing ? "success" : "warning",
    });

    if (!confirmed) return;

    setUpdatingId(item.id);
    try {
      await updateDoc(doc(db, "issue_logs", item.id), {
        status: isClosing ? "Closed" : "Reopened",
        updatedAt: serverTimestamp(),
        resolutionConfirmedAt: isClosing ? serverTimestamp() : null,
        resolutionConfirmedById: isClosing ? user?.uid || "" : "",
        reopenedAt: isClosing ? item.reopenedAt || null : serverTimestamp(),
      });
      toast.success(isClosing ? "Issue closed successfully." : "Issue reopened successfully.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the issue."));
    } finally {
      setUpdatingId("");
    }
  };

  const moduleOptions = useMemo(
    () => [
      { value: "all", label: "All Modules" },
      ...Array.from(new Set([...MODULE_OPTIONS, ...visibleItems.map((item) => item.module).filter(Boolean)])).map(
        (moduleName) => ({
          value: String(moduleName).toLowerCase(),
          label: moduleName,
        }),
      ),
    ],
    [visibleItems],
  );

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    ...STATUS_OPTIONS.map((status) => ({
      value: status.toLowerCase(),
      label: status,
    })),
  ];

  return (
    <>
      {ConfirmDialog}
      <ControlCenterTableShell
        navbar={shell.navbar}
        sidebar={shell.sidebar}
        title={isAdmin ? "Support Issue Desk" : "Issue Log"}
        subtitle={
          isAdmin
            ? "Track incoming user issues, manage support statuses, and close the feedback loop."
            : "Log platform issues, track support updates, and confirm when a fix has solved your problem."
        }
        icon={<LifeBuoy size={18} />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by module, user, or issue details..."
        summary={`${filteredItems.length} Issue${filteredItems.length === 1 ? "" : "s"}`}
        loading={loading}
        hasData
        sectionTitle={isAdmin ? "Support Queue" : "My Reported Issues"}
        sectionSubtitle={
          isAdmin
            ? "Review newly logged tickets, assign a support status, and mark issues as resolved."
            : "Submit a new issue and keep an eye on status updates from support."
        }
        sectionBadgeLabel={isAdmin ? "Open Queue" : "Pending Response"}
        sectionBadgeValue={
          visibleItems.filter((item) =>
            ["open", "in progress", "reopened"].includes(String(item.status || "").toLowerCase()),
          ).length
        }
        toolbar={
          <TableQueryControls
            filters={[
              {
                key: "status",
                label: "Status Filter",
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
              },
              {
                key: "module",
                label: "Module Filter",
                value: moduleFilter,
                onChange: setModuleFilter,
                options: moduleOptions,
              },
            ]}
          />
        }
      >
        <div className="space-y-6 p-4 sm:p-6">
          {!isAdmin ? (
            <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/40 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2 text-orange-400">
                  <Bug size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Log New Issue
                  </p>
                  <h2 className="text-sm font-bold text-white">Tell support what is going wrong</h2>
                </div>
              </div>

              <form onSubmit={handleSubmitIssue} className="grid gap-4">
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Module
                  <select
                    value={formData.module}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, module: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 outline-none transition-colors focus:border-orange-500"
                  >
                    {MODULE_OPTIONS.map((moduleName) => (
                      <option key={moduleName} value={moduleName}>
                        {moduleName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Issue Description
                  <textarea
                    rows="5"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, description: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500"
                    placeholder="Describe what happened, where it happened, and anything support should know to reproduce it."
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={14} />
                    {isSubmitting ? "Submitting..." : "Log Issue"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {!isAdmin && pendingResolutionConfirmation.length > 0 ? (
            <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">
                  <CheckCheck size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                    Resolution Update
                  </p>
                  <h2 className="text-sm font-bold text-white">
                    Support marked {pendingResolutionConfirmation.length} issue
                    {pendingResolutionConfirmation.length === 1 ? "" : "s"} as resolved
                  </h2>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {pendingResolutionConfirmation.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-emerald-500/20 bg-slate-950/50 p-4"
                  >
                    <p className="text-xs font-bold text-white">{item.module}</p>
                    <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      Resolved At: {formatDateTime(item.resolvedAt)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => handleUserResolutionAction(item, "close")}
                        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
                      >
                        Confirm Resolved
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => handleUserResolutionAction(item, "reopen")}
                        className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
                      >
                        Still Need Help
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950/30">
            <div className="max-h-[36rem] overflow-auto">
              {filteredItems.length > 0 ? (
                <table className="min-w-full text-left">
                  <thead className="sticky top-0 z-10 bg-[#08101f] text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Date Logged</th>
                      <th className="px-4 py-4">Module</th>
                      <th className="px-4 py-4">Issue Description</th>
                      <th className="px-4 py-4">Reported By</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Resolved At</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredItems.map((item) => {
                      const currentStatus = statusEdits[item.id] || item.status || "Open";
                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4 text-xs text-slate-300">
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="px-4 py-4 text-xs font-semibold uppercase text-slate-200">
                            {item.module || "Other"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {item.description || "No description provided."}
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-300">
                            <div>{item.reportedByName || "Unknown User"}</div>
                            <div className="mt-1 text-slate-500">{item.reportedByEmail || "No email"}</div>
                          </td>
                          <td className="px-4 py-4">
                            {isAdmin ? (
                              <select
                                value={currentStatus}
                                onChange={(event) =>
                                  setStatusEdits((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 outline-none transition-colors focus:border-orange-500"
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <StatusPill status={item.status || "Open"} />
                            )}
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-300">
                            {formatDateTime(item.resolvedAt)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {isAdmin ? (
                              <button
                                type="button"
                                disabled={updatingId === item.id || currentStatus === (item.status || "Open")}
                                onClick={() => handleAdminStatusUpdate(item)}
                                className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-200 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Save size={12} />
                                Update
                              </button>
                            ) : String(item.status || "").toLowerCase() === "resolved" &&
                              !item.resolutionConfirmedAt ? (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                                Awaiting Your Confirmation
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                <RefreshCcw size={12} />
                                Tracking
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-20 text-center text-sm text-slate-500">
                  {isAdmin
                    ? "No support issues match the current filters."
                    : "No issues logged yet. Use the form above whenever you need help."}
                </div>
              )}
            </div>
          </section>
        </div>
      </ControlCenterTableShell>
    </>
  );
};

const StatusPill = ({ status }) => {
  const normalized = String(status || "").trim().toLowerCase();
  const className =
    normalized === "resolved" || normalized === "closed"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : normalized === "in progress"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
        : normalized === "reopened"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
          : "border-orange-500/30 bg-orange-500/10 text-orange-200";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${className}`}
    >
      {status}
    </span>
  );
};

export default IssueLogCenter;
