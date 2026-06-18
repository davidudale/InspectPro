import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, CheckCircle, Clock, FileSearch, MapPin, RotateCcw } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../../Auth/firebase";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";
import TableQueryControls from "../../Common/TableQueryControls";
import { useConfirmDialog } from "../../Common/ConfirmDialog";
import { useAuth } from "../../Auth/AuthContext";
import { getToastErrorMessage } from "../../../utils/toast";
import { groupRowsByOption, TABLE_GROUP_NONE } from "../../../utils/tableGrouping";
import { getExternalFeedbackSummary } from "../../../utils/externalFeedbackSummary";
import InternalReviewerNavbar from "./InternalReviewerNavbar";
import InternalReviewerSidebar from "./InternalReviewerSidebar";

const INTERNAL_REVIEW_IN_PROGRESS_STATUS = "internal Review in progress";

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatTimestamp = (value) => {
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

const getRowTimestamp = (row) =>
  row?.updatedAt ||
  row?.lastUpdated ||
  row?.internalReviewForwardedAt ||
  row?.createdAt ||
  row?.timestamp ||
  row?.startDate ||
  null;

const getStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (
    normalized === "pending engineering evaluation" ||
    normalized === "pending internal review"
  ) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  }
  if (normalized.includes("approved") || normalized.includes("forwarded")) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (normalized.includes("returned") || normalized.includes("rejected")) {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }
  return "border-slate-700 bg-slate-900/70 text-slate-300";
};

const InternalProjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState(TABLE_GROUP_NONE);
  const [loading, setLoading] = useState(true);
  const [returnProject, setReturnProject] = useState(null);
  const [returnComment, setReturnComment] = useState("");
  const [updatingProjectId, setUpdatingProjectId] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      const nextProjects = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .sort((a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)));
      setProjects(nextProjects);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(projects.map((project) => project.status).filter(Boolean))).map(
        (status) => ({ value: String(status).toLowerCase(), label: status }),
      ),
    [projects],
  );

  const filteredProjects = useMemo(
    () =>
      projects
        .filter((project) => {
          const haystack = [
            project.projectName,
            project.projectId,
            project.clientName,
            project.client,
            project.locationName,
            project.equipmentTag,
            project.tag,
            project.status,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(searchTerm.toLowerCase());
        })
        .filter(
          (project) =>
            statusFilter === "all" ||
            String(project.status || "").toLowerCase() === statusFilter,
        ),
    [projects, searchTerm, statusFilter],
  );

  const groupedProjects = useMemo(
    () =>
      groupRowsByOption(filteredProjects, groupBy, [
        {
          value: "status",
          label: "Status",
          getValue: (project) => project.status,
          emptyLabel: "Pending",
        },
        {
          value: "client",
          label: "Client",
          getValue: (project) => project.clientName || project.client,
          emptyLabel: "Unassigned Client",
        },
      ]),
    [filteredProjects, groupBy],
  );

  const getProjectFeedback = (project) => {
    const messages = [];
    const externalFeedback = getExternalFeedbackSummary(project);
    const internalFeedback = String(
      project?.internalReviewComment ||
        project?.returnNote ||
        project?.remark ||
        project?.remarks ||
        project?.adminRemark ||
        project?.adminRemarks ||
        project?.feedback ||
        "",
    ).trim();

    if (externalFeedback) {
      messages.push(`External reviewer: ${externalFeedback}`);
    }

    if (internalFeedback) {
      messages.push(internalFeedback);
    }

    return messages.join("\n\n").trim();
  };

  const reviewerName =
    user?.fullName || user?.name || user?.displayName || user?.email || "Internal Reviewer";

  const isInternalReviewActionable = (status) =>
    [
      "pending engineering evaluation",
      "pending internal review",
      "internal review in progress",
    ].includes(
      String(status || "").trim().toLowerCase(),
    );

  const handleOpenReview = async (project) => {
    const normalizedStatus = String(project?.status || "").trim().toLowerCase();

    if (
      normalizedStatus === "pending engineering evaluation" ||
      normalizedStatus === "pending internal review"
    ) {
      setUpdatingProjectId(project.id);
      try {
        await updateDoc(doc(db, "projects", project.id), {
          status: INTERNAL_REVIEW_IN_PROGRESS_STATUS,
          internalReviewStatus: "In Progress",
          internalReviewStartedAt: serverTimestamp(),
          internalReviewStartedBy: reviewerName,
          internalReviewStartedById: user?.uid || "",
          lastUpdated: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        toast.error(getToastErrorMessage(error, "Unable to start internal review."));
        setUpdatingProjectId("");
        return;
      }
      setUpdatingProjectId("");
    }

    navigate(`/internal-reviewer/review/${project.id || project.projectId}`, {
      state: {
        preFill: {
          ...project,
          status:
            normalizedStatus === "pending engineering evaluation" ||
            normalizedStatus === "pending internal review"
              ? INTERNAL_REVIEW_IN_PROGRESS_STATUS
              : project.status,
          assetType: project.equipmentCategory || project.assetType,
        },
      },
    });
  };

  const handleApproveProject = async (project) => {
    const normalizedStatus = String(project?.status || "").trim().toLowerCase();
    if (!isInternalReviewActionable(normalizedStatus)) {
      toast.info("Only projects in internal review can be approved here.");
      return;
    }

    const assignedManagerName = project?.managerName || "Manager";
    const confirmed = await openConfirm({
      title: "Approve Internal Review",
      message: `Forward "${project.projectName || project.projectId || "this project"}" to ${assignedManagerName}?`,
      confirmLabel: "Approve & Forward",
      cancelLabel: "Cancel",
      tone: "success",
    });
    if (!confirmed) return;

    setUpdatingProjectId(project.id);
    try {
      await updateDoc(doc(db, "projects", project.id), {
        status: `Passed and Forwarded to ${assignedManagerName}`,
        internalReviewStatus: "Approved",
        internalReviewComment: "",
        internalReviewedAt: serverTimestamp(),
        internalReviewedBy: reviewerName,
        internalReviewedById: user?.uid || "",
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Project forwarded to Manager.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to approve internal review."));
    } finally {
      setUpdatingProjectId("");
    }
  };

  const handleReturnProject = async () => {
    const feedback = returnComment.trim();
    if (!returnProject?.id) return;
    if (!feedback) {
      toast.error("Please add a return comment.");
      return;
    }

    setUpdatingProjectId(returnProject.id);
    try {
      await updateDoc(doc(db, "projects", returnProject.id), {
        status: "Returned by Internal Reviewer",
        internalReviewStatus: "Returned",
        internalReviewComment: feedback,
        internalReviewedAt: serverTimestamp(),
        internalReviewedBy: reviewerName,
        internalReviewedById: user?.uid || "",
        returnNote: feedback,
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.warning("Project returned to Lead Inspector.");
      setReturnProject(null);
      setReturnComment("");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to return internal review."));
    } finally {
      setUpdatingProjectId("");
    }
  };

  return (
    <>
    {ConfirmDialog}
    <ControlCenterTableShell
      navbar={<InternalReviewerNavbar />}
      sidebar={<InternalReviewerSidebar />}
      title="Internal Review Projects"
      subtitle="Review project records, monitor workflow stages, and identify items ready for internal review."
      icon={<FileSearch size={18} />}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search internal review projects..."
      summary={`${filteredProjects.length} Project${filteredProjects.length === 1 ? "" : "s"}`}
      loading={loading}
      hasData={filteredProjects.length > 0}
      emptyTitle="No Projects Found"
      emptyDescription="Projects visible to Internal Reviewers will appear here when available."
      //sectionTitle="Project Review Queue"
      //sectionSubtitle="All project records visible to internal reviewers."
      //sectionBadgeLabel="Visible"
      //sectionBadgeValue={filteredProjects.length}
      toolbar={
        <TableQueryControls
          filters={[
            {
              key: "status",
              label: "Status Filter",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [{ value: "all", label: "All Statuses" }, ...statusOptions],
            },
          ]}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupOptions={[
            { value: TABLE_GROUP_NONE, label: "No Grouping" },
            { value: "status", label: "Status" },
            { value: "client", label: "Client" },
          ]}
        />
      }
    >
      <div className="table-scroll-region max-h-[68vh] overflow-auto">
        <table className="w-full min-w-[1040px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800/80 bg-[#0b1326]">
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Project Identity
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Client
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Facility
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Inspection Date
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Status
              </th>
              <th className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Feedback
              </th>
              <th className="px-3 py-3 text-right text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Approval Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {groupedProjects.map((group) => (
              <React.Fragment key={group.key}>
                {groupBy !== TABLE_GROUP_NONE ? (
                  <tr className="bg-[#08101f]">
                    <td
                      colSpan="7"
                      className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-orange-400"
                    >
                      {group.label} ({group.items.length})
                    </td>
                  </tr>
                ) : null}
                {group.items.map((project) => (
                  <tr key={project.id} className="group transition-colors hover:bg-white/5">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-orange-500 shadow-inner">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase text-white transition-colors group-hover:text-orange-500">
                            {project.projectName || "Unnamed Project"}
                          </p>
                          <p className="text-[9px] font-mono uppercase text-slate-500">
                            {project.projectId || project.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-[11px] font-semibold uppercase text-slate-300">
                      {project.clientName || project.client || "N/A"}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={14} className="text-orange-500/50" />
                        <span className="text-xs font-medium">{project.locationName || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={14} className="text-orange-500/50" />
                        <span className="text-xs font-medium">
                          {formatTimestamp(project.inspectionDate || project.startDate || getRowTimestamp(project))}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={14} className="text-orange-500/50" />
                        <span className="text-xs font-medium">{project.status || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="max-w-[260px] whitespace-pre-wrap text-xs leading-5 text-slate-300">
                        {getProjectFeedback(project) || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(project)}
                          disabled={updatingProjectId === project.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-lg transition-all hover:bg-orange-700"
                        >
                          {isInternalReviewActionable(project.status) ? "Review" : "View"}
                        </button>
                       {/* <button
                          type="button"
                          onClick={() => handleApproveProject(project)}
                          disabled={
                            updatingProjectId === project.id ||
                            !isInternalReviewActionable(project.status)
                          }
                          title="Approve and forward to Manager"
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReturnProject(project);
                            setReturnComment("");
                          }}
                          disabled={
                            updatingProjectId === project.id ||
                            !isInternalReviewActionable(project.status)
                          }
                          title="Return to Lead Inspector"
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <RotateCcw size={14} />
                        </button>*/}
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </ControlCenterTableShell>
    {returnProject ? (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-300">
            Return To Lead Inspector
          </p>
          <h3 className="mt-2 text-xl font-bold text-white">
            {returnProject.projectName || returnProject.projectId || "Project"}
          </h3>
          <textarea
            value={returnComment}
            onChange={(event) => setReturnComment(event.target.value)}
            placeholder="Describe what the Lead Inspector should correct or verify..."
            className="mt-4 h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200 outline-none focus:border-rose-500"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setReturnProject(null);
                setReturnComment("");
              }}
              disabled={updatingProjectId === returnProject.id}
              className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold uppercase text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReturnProject}
              disabled={updatingProjectId === returnProject.id}
              className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {updatingProjectId === returnProject.id ? "Returning..." : "Submit Return"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
};

export default InternalProjects;
