import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc, // Added for status update
  doc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  Briefcase,
  Search,
  MapPin,
  ShieldAlert,
  Activity,
  RotateCcw, // Icon for returning to inspector
  CheckCircle,
} from "lucide-react";

import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../utils/toast";
import { useConfirmDialog } from "../../Common/ConfirmDialog";

import { useAuth } from "../../Auth/AuthContext";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";

const PendingApprovals = () => {
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  const isPendingReviewStatus = (status = "") =>
    status.startsWith("Pending Confirmation");

  useEffect(() => {
    if (!user?.uid) return;

    const projectsQuery = query(
      collection(db, "projects"),
      orderBy("startDate", "desc"),
    );
    const unsubscribe = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const projectsData = snapshot.docs.map((projectDoc) => ({
          id: projectDoc.id,
          ...projectDoc.data(),
        }));
        setProjects(projectsData);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        const fallbackQuery = query(collection(db, "projects"));
        onSnapshot(fallbackQuery, (snapshot) => {
          const fallbackData = snapshot.docs.map((projectDoc) => ({
            id: projectDoc.id,
            ...projectDoc.data(),
          }));
          setProjects(fallbackData);
          setLoading(false);
        });
      },
    );

    return () => unsubscribe();
  }, [user]);

  // --- NEW: Function to return manifest to Inspector ---
  const handleReturnToInspector = async (
    projectId,
    name,
    supervisorName = "Lead Inspector",
  ) => {
    const confirmed = await openConfirm({
      title: "Return to Lead Inspector",
      message: `Return "${name}" to Lead Inspector for corrections?`,
      confirmLabel: "Return",
      cancelLabel: "Cancel",
      tone: "warning",
    });
    if (!confirmed) return;
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        status: `Pending Confirmation- Report With ${supervisorName}`,
        lastUpdated: serverTimestamp(),
        returnNote: "Manager requested review/corrections",
      });
      toast.warning(`Project ${name} returned to field status.`);
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Unable to update the project status."));
    }
  };

  const filteredProjects = projects
    .filter(
      (p) =>
        p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectId?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort(
      (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
    );

  return (
    <>
      {ConfirmDialog}
      <ControlCenterTableShell
        navbar={<ManagerNavbar />}
        sidebar={<ManagerSidebar />}
        title="Pending Approvals"
        subtitle="Review forwarded reports, return items for correction, and move approved work to the archive."
        icon={<Briefcase size={18} />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search reviews..."
        summary={`${filteredProjects.length} Pending Approval${filteredProjects.length === 1 ? "" : "s"}`}
        
        loading={loading}
        hasData={filteredProjects.length > 0}
        emptyTitle="No Pending Approvals"
        emptyDescription="Reports forwarded to management for approval will appear here."
      >
        <div className="table-scroll-region max-h-[68vh] overflow-auto">
          <table className="w-full min-w-[840px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0b1326]">
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Identity</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Client</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Facility</th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-3 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredProjects.map((project) => (
                        <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 shadow-inner">
                                <Briefcase size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white uppercase group-hover:text-orange-500 transition-colors">{project.projectName}</p>
                                <p className="text-[9px] font-mono text-slate-500 uppercase">{project.projectId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-[11px] text-slate-300 font-semibold uppercase">{project.clientName}</td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-orange-500/50" />
                              <span className="text-xs font-medium">{project.locationName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-orange-500/50" />
                              <span className="text-xs font-medium">{project.status}</span>
                            </div>
                          </td>

                          <td className="px-3 py-4 text-right space-x-2 item-center flex">
                            {/* NEW: Reject/Return Button */}
                           {/* <button
                              onClick={() =>
                                handleReturnToInspector(
                                  project.id,
                                  project.projectName,
                                  project.supervisorName,
                                )
                              }
                              className="bg-red-900/20 hover:bg-red-900/40 text-red-500 p-2 rounded-xl border border-red-500/20 transition-all group/btn"
                              title="Return to Inspector"
                            >
                             <RotateCcw size={16} className="group-active/btn:rotate-[-90deg] transition-transform" />
                            </button>*/}

                            {/* View Report / Final Approval Button */}
                            <button
                              onClick={() => navigate("/ReviewForApproval", { 
                                state: { preFill: { ...project, assetType: project.equipmentCategory || project.assetType } } 
                              })}
                               className="bg-orange-600 hover:bg-orange-700 text-white ml-4 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.16em] transition-all shadow-lg "
                            >
                             {String(project?.status || "")
                               .toLowerCase()
                               .startsWith("passed and forwarded")
                               ? "Review"
                               : "View"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
        </div>
      </ControlCenterTableShell>
    </>
  );
};

export default PendingApprovals;

