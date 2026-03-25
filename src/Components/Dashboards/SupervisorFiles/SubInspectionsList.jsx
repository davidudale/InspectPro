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
} from "lucide-react";

import { toast } from "react-toastify";
import { useConfirmDialog } from "../../Common/ConfirmDialog";
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";
import { useAuth } from "../../Auth/AuthContext";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";

const SubInspectionsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (value?.seconds) return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const getRowTimestamp = (row) =>
    row?.updatedAt ||
    row?.lastUpdated ||
    row?.inspectionStartedAt ||
    row?.createdAt ||
    row?.timestamp ||
    row?.startDate ||
    null;
 
   useEffect(() => {
    if (!user?.uid) return;
  
    let q;
  
    // 1. DYNAMIC QUERY SELECTION BASED ON ROLE
    // Managers/Admins see everything.
    if (user?.role === "Manager" || user?.role === "Admin") {
      q = query(
        collection(db, "projects"),
        orderBy("startDate", "desc")
      );
    } 
    // Inspectors ONLY see their own specific confirmed assignments
    else {
      q = query(
        collection(db, "projects"),
        where("supervisorId", "==", user.uid),
        orderBy("startDate", "desc")
      );
    }
  
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projectsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(
          projectsData.sort(
            (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
          ),
        );
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        // Simplified fallback to avoid index issues during role transition
        const fallbackQ = query(collection(db, "projects"));
        onSnapshot(fallbackQ, (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Manual role filter for fallback if index isn't ready
          if (user?.role === "Lead Inspector" || user?.role === "External_Reviewer") {
            setProjects(
              data
                .filter((p) => p.supervisorId === user.uid)
                .sort(
                  (a, b) =>
                    toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
                ),
            );
          } else {
            setProjects(
              data.sort(
                (a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)),
              ),
            );
          }
          setLoading(false);
        });
      }
    );
  
    return () => unsubscribe();
  }, [user]);

  // --- NEW: Function to return manifest to Inspector ---
  const handleReturnToInspector = async (projectId, name, inspectorName = "Inspector") => {
    const confirmed = await openConfirm({
      title: "Return to Inspector",
      message: `Return "${name}" to Inspector for corrections?`,
      confirmLabel: "Return",
      cancelLabel: "Cancel",
      tone: "warning",
    });
    if (!confirmed) return;
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        status: `Returned for correction - Rpt_With ${inspectorName}`,
        lastUpdated: serverTimestamp(),
        returnNote: "Lead Inspector requested review/corrections",
      });
      toast.warning(`Project ${name} reverted to field status`);
    } catch (error) {
      toast.error("Status update failed: " + error.message);
    }
  };

  const handleReview = async (project) => {
    const normalizedStatus = String(project?.status || "").toLowerCase();
    const isPendingConfirmation = normalizedStatus.startsWith("pending confirmation");
    const isLeadReview = normalizedStatus.startsWith("in lead review");
    const isReviewStatus = isPendingConfirmation || isLeadReview;
    const preFill = {
      ...project,
      assetType: project.equipmentCategory || project.assetType,
    };

    if (!isReviewStatus) {
      navigate(`/review/${project.id || project.projectId}`, {
        state: { preFill },
      });
      return;
    }

    try {
      let nextStatus = project?.status || "";

      if (isPendingConfirmation) {
        const assignedSupervisorName =
          project?.supervisorName || user?.displayName || "External_Reviewer";
        nextStatus = `In Lead Review - ${assignedSupervisorName}`;
        const projectRef = doc(db, "projects", project.id);
        await updateDoc(projectRef, {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      }

      navigate("/pendinginspections", {
        state: {
          preFill: {
            ...preFill,
            status: nextStatus,
          },
        },
      });
    } catch (error) {
      toast.error(`Failed to set status: ${error.message}`);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectId?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => toMillis(getRowTimestamp(b)) - toMillis(getRowTimestamp(a)));

  return (
    <>
      {ConfirmDialog}
      <ControlCenterTableShell
        navbar={user?.role === "Manager" ? <ManagerNavbar /> : <SupervisorNavbar />}
        sidebar={user?.role === "Manager" ? <ManagerSidebar /> : <SupervisorSidebar />}
        title="Pending Approvals"
        subtitle="Review submitted reports, track approval stages, and open lead-review actions."
        icon={<Briefcase size={18} />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search reviews..."
        summary={`${filteredProjects.length} Approval Item${filteredProjects.length === 1 ? "" : "s"}`}
              loading={loading}
        hasData={filteredProjects.length > 0}
        emptyTitle="No Pending Approvals"
        emptyDescription="Projects routed for lead review will appear here with their current workflow stage."
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
                            {/*<button
                              onClick={() =>
                                handleReturnToInspector(
                                  project.id,
                                  project.projectName,
                                  project.inspectorName,
                                )
                              }
                              className="bg-red-900/20 hover:bg-red-900/40 text-red-500 p-2 rounded-xl border border-red-500/20 transition-all group/btn"
                              title="Return to Inspector"
                            >
                              <RotateCcw size={16} className="group-active/btn:rotate-[-90deg] transition-transform" />
                            </button>*/}

                            {/* View Report / Final Approval Button */}
                            <button
                              onClick={() => handleReview(project)}
                               className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.16em] transition-all shadow-lg"
                            >
                              {["pending confirmation", "in lead review"].some((statusPrefix) =>
                                String(project?.status || "")
                                  .toLowerCase()
                                  .startsWith(statusPrefix),
                              )
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

export default SubInspectionsList;







