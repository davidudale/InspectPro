import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { 
  Briefcase, Search, ArrowUpRight, 
  MapPin, Users, ShieldAlert
} from "lucide-react";
import { useAuth } from "../../Auth/AuthContext";
import ExternalNavbar from "./ExternalNavbar";
import ExternalSideBar from "./ExternalSideBar";

const ProjectReviewing = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      return undefined;
    }

    const q = query(
      collection(db, "projects"),
      where("externalReviewerId", "==", user.uid),
      where("status", "==", "Approved"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, [user?.uid]);

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
      <ExternalNavbar />
      <div className="flex flex-1">
        <ExternalSideBar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            
            {/* Header & Advanced Search */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                  <Briefcase className="text-orange-500" /> Projects Review
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  External Reviewer Projects
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
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inspection Start Date</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inspection End Date</th>
                        {/*<th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Status</th>*/}
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Open Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredProjects.map((project) => {
                        const operationalStatus = getOperationalStatus(project);
                        const projectStartDate = getProjectStartDate(project);
                        const projectEndDate = getProjectEndDate(project);
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
                            <div className="text-xs font-medium text-slate-300">
                              {formatDate(projectStartDate)}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-xs font-medium text-slate-300">
                              {projectEndDate ? formatDate(projectEndDate) : "Pending"}
                            </div>
                          </td>
                          {/*<td className="p-6">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                              isInProgress
                                ? 'border-orange-500/50 text-orange-500 bg-orange-500/5' 
                                : 'border-slate-700 text-slate-500 bg-slate-800/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isInProgress ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`}></span>
                              {operationalStatus}
                            </div>
                          </td>*/}
                          <td className="p-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => navigate(`/admin/project/${project.id}`)}
                                className="ml-2 p-2.5 text-[11px] bg-orange-600 border border-orange-500/20 text-white hover:bg-orange-700 transition-all rounded-xl shadow-lg shadow-orange-900/20"
                                title="View Report"
                              >
                                View Report
                              </button>
                               <button 
                                onClick={() => navigate(`/admin/project/${project.id}`)}
                                className="ml-2 p-2.5 text-[11px] bg-orange-600 border border-orange-500/20 text-white hover:bg-orange-700 transition-all rounded-xl shadow-lg shadow-orange-900/20"
                                title="Send Feedback"
                              >
                                Send Feedback
                              </button>
                            </div>
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
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Approved Projects Found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectReviewing;
