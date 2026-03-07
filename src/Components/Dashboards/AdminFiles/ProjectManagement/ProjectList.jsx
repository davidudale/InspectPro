import React, { useState, useEffect } from "react";
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

const ProjectList = () => {
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
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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

  const filteredProjects = projects
    .filter(
      (p) =>
        p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.clientName || p.client || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        p.projectId?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort(
      (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
    );

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
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      {ConfirmDialog}
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            
            {/* Header & Advanced Search */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                  <Briefcase className="text-orange-500" /> Project Directory
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  Project List
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by ID, Client, or Project Name..." 
                    className="w-full bg-slate-900/50 border border-slate-800 p-4 pl-12 rounded-2xl text-xs focus:border-orange-500 outline-none transition-all shadow-inner backdrop-blur-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => navigate("/projects")}
                  className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-2xl shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2 font-bold uppercase text-[10px] tracking-widest"
                >
                  <Briefcase size={14} /> Add Project
                </button>
              </div>
            </div>

            {/* TABULAR INTERFACE */}
            {filteredProjects.length > 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/50">
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Identity</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Client & Industry</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Facility Location</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Status</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredProjects.map((project) => {
                        const operationalStatus = getOperationalStatus(project);
                        const isInProgress = operationalStatus
                          .toLowerCase()
                          .startsWith("in progress");
                        return (
                        <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                          <td className="p-6">
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
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-slate-600" />
                              <div>
                                <p className="text-xs font-semibold text-slate-300 uppercase">{project.clientName || project.client || "N/A"}</p>
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Oil & Gas Sector</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-orange-500/50" />
                              <span className="text-xs font-medium">{project.locationName || project.location || "On-Shore Terminal"}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                              isInProgress
                                ? 'border-orange-500/50 text-orange-500 bg-orange-500/5' 
                                : 'border-slate-700 text-slate-500 bg-slate-800/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isInProgress ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`}></span>
                              {operationalStatus}
                            </div>
                          </td>
                          <td className="p-6 text-right">
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
                
                {/* Table Footer */}
                <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                    Total Registered Reports: {filteredProjects.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time sync active</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
                <ShieldAlert size={48} className="text-slate-800 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Active Projects Found</p>
                <button 
                  onClick={() => navigate("/projects")}
                  className="mt-6 text-orange-500 text-[10px] font-bold uppercase border-b border-orange-500 pb-1 hover:text-white hover:border-white transition-all"
                >
                  Launch First Operational Manifest
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectList;
