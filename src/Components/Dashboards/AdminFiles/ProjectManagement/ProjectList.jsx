import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { collection, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";
import { 
  Briefcase, Search, ArrowUpRight, 
  MapPin, Users, Edit3, Trash2, ShieldAlert, MoreVertical
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useConfirmDialog } from "../../../Common/ConfirmDialog";
import ControlCenterTableShell from "../../../Common/ControlCenterTableShell";

const ProjectList = () => {
  const formatDate = (value) => {
    if (!value) return "N/A";
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleDateString();
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleDateString();
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
  const getRowTimestamp = (row) =>
    row?.updatedAt ||
    row?.lastUpdated ||
    row?.createdAt ||
    row?.timestamp ||
    row?.startDate ||
    0;
  const getProjectStartDate = (project) =>
    project?.startDate ||
    project?.deploymentDate ||
    project?.inspectionStartedAt ||
    project?.createdAt ||
    project?.timestamp ||
    null;
  const getProjectEndDate = (project) => {
    const status = String(project?.status || "").toLowerCase();
    if (status !== "approved") return null;
    return (
      project?.approvedAt ||
      project?.confirmedAt ||
      project?.confirmationDate ||
      project?.updatedAt ||
      project?.lastUpdated ||
      null
    );
  };
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort(
          (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
        );
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (projectId, name) => {
    const confirmed = await openConfirm({
      title: "Delete Project",
      message: `CRITICAL: Permanently delete project "${name}" and its embedded report data?`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "projects", projectId));
      toast.success(`${name} deleted from database`);
    } catch (error) {
      toast.error("Deletion failed: Admin permissions required");
    }
  };

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    return [...projects]
      .filter(
        (p) =>
          p.projectName?.toLowerCase().includes(normalizedSearch) ||
          (p.clientName || p.client || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          p.projectId?.toLowerCase().includes(normalizedSearch),
      )
      .sort(
        (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
      );
  }, [projects, searchTerm]);

  const getOperationalStatus = (project) => {
    const topLevelStatus = String(project?.status || "").trim();
    const reportStatus = String(project?.report?.status || "").trim();
    const topLower = topLevelStatus.toLowerCase();
    const reportLower = reportStatus.toLowerCase();

    // Primary source: top-level project workflow status (kept in sync across stages).
    if (topLevelStatus) {
      return topLevelStatus;
    }

    // Fallback for legacy rows where top-level status has not been synchronized yet.
    if (reportStatus && !["draft", "new"].includes(reportLower)) {
      return reportStatus;
    }

    // Safety fallback for rows where start timestamp exists but status text was not synchronized.
    if (
      project?.inspectionStartedAt &&
      (topLower.startsWith("not started") || !topLevelStatus)
    ) {
      return `In Progress - ${project?.inspectorName || "Inspector"}`;
    }

    return "Planned";
  };

  return (
    <>
      {ConfirmDialog}
      <ControlCenterTableShell
        navbar={<AdminNavbar />}
        sidebar={<AdminSidebar />}
        title="Project Directory"
        subtitle="Monitor every project, review lifecycle status, and open admin actions from one grid."
        icon={<Briefcase size={18} />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by ID, client, or project name..."
        summary={`${filteredProjects.length} Project${filteredProjects.length === 1 ? "" : "s"}`}
        loading={false}
        hasData={filteredProjects.length > 0}
        emptyTitle="No Active Projects Found"
        emptyDescription="Projects created in setup will appear here for editing, deletion, and preview."
      >
        <div className="flex items-center justify-end border-b border-slate-800/80 bg-slate-950/20 px-4 py-4">
          <button 
            onClick={() => navigate("/projects")}
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest"
          >
            <Briefcase size={14} /> Add Project
          </button>
        </div>
        <div className="table-scroll-region max-h-[68vh] overflow-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0b1326]">
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Identity</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Client & Industry</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Facility Location</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Start Date</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">End Date</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Status</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Report View</th>
                        <th className="px-3 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredProjects.map((project) => {
                        const operationalStatus = getOperationalStatus(project);
                        const projectStartDate = getProjectStartDate(project);
                        const projectEndDate = getProjectEndDate(project);
                        const reportViewCode =
                          String(project?.status || "").trim().toLowerCase() === "approved"
                            ? "External"
                            : "Internal";
                        const isInProgress = operationalStatus
                          .toLowerCase()
                          .startsWith("in progress");
                        return (
                        <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 group-hover:border-orange-500/50 transition-all shadow-inner">
                                <Briefcase size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-orange-500 transition-colors">
                                  {project.projectName}
                                </p>
                                <p className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase">{project.projectId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-slate-600" />
                              <div>
                                <p className="text-xs font-semibold text-slate-300 uppercase">{project.clientName || project.client || "N/A"}</p>
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Oil & Gas Sector</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-orange-500/50" />
                              <span className="text-xs font-medium">{project.locationName || project.location || "On-Shore Terminal"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {formatDate(projectStartDate)}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-xs font-medium text-slate-300">
                              {projectEndDate ? formatDate(projectEndDate) : "Pending"}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                              isInProgress
                                ? 'border-orange-500/50 text-orange-500 bg-orange-500/5' 
                                : 'border-slate-700 text-slate-500 bg-slate-800/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isInProgress ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`}></span>
                              {operationalStatus}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="inline-flex min-w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-[0.3em] text-white">
                              {reportViewCode}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => navigate(`/viewprojects/project-edit/${project.projectId || project.id}`, { state: { editMode: true, project } })}
                                className="p-2.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-blue-500 hover:border-blue-500/50 transition-all rounded-xl shadow-inner"
                                title="Edit Project"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDelete(project.id, project.projectName)}
                                className="p-2.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500/50 transition-all rounded-xl shadow-inner"
                                title="Delete Manifest"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button 
                                onClick={() => navigate(`/admin/project/${project.id}`)}
                                className="ml-2 p-2.5 bg-orange-600 border border-orange-500/20 text-white hover:bg-orange-700 transition-all rounded-xl shadow-lg shadow-orange-900/20"
                                title="Template Preview"
                              >
                                <ArrowUpRight size={14} />
                              </button>
                            </div>
                            <MoreVertical size={16} className="text-slate-800 group-hover:hidden inline-block ml-auto" />
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
        </div>
        <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                    Total Registered Reports: {filteredProjects.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time sync active</span>
                  </div>
        </div>
      </ControlCenterTableShell>
    </>
  );
};

export default ProjectList;
