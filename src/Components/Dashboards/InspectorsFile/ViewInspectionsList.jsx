import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
// NEW: Import 'where' for filtering
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Briefcase,
  Search,
  ArrowUpRight,
  Clock,
  MapPin,
  Users,
  Edit3,
  Trash2,
  ShieldAlert,
  ChevronRight,
  MoreVertical,
  Activity,
} from "lucide-react";

import { toast } from "react-toastify";
import { getToastErrorMessage } from "../../../utils/toast";
import { useConfirmDialog } from "../../Common/ConfirmDialog";
import InspectorNavbar from "./InspectorNavbar";
import InspectorSidebar from "./InspectorSidebar";
import { useAuth } from "../../Auth/AuthContext"; // Ensure useAuth is imported
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";

const ViewInspectionsList = () => {
  const { user } = useAuth(); // Get current logged-in inspector
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
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
    row?.inspectionStartedAt ||
    row?.createdAt ||
    row?.timestamp ||
    row?.startDate ||
    0;
  const isPassedForwardedStatus = (status = "") =>
    String(status).startsWith("Passed and Forwarded to ");

  useEffect(() => {
  if (!user?.uid) {
    setProjects([]);
    setLoading(false);
    return;
  }

  let q;
  let fallbackUnsubscribe = null;

  // 1. DYNAMIC QUERY SELECTION BASED ON ROLE
  // Managers and Admins see everything, then filtered by passed/forwarded status.
  if (user?.role === "Manager" || user?.role === "Admin") {
    q = query(
      collection(db, "projects"),
      orderBy("startDate", "asc")
    );
  } 
  // Inspectors see all their assignments so status remains visible across workflow stages.
  else {
    q = query(
      collection(db, "projects"),
      where("inspectorId", "==", user.uid),
      orderBy("startDate", "asc")
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (user?.role === "Manager" || user?.role === "Admin") {
        setProjects(
          projectsData.filter((project) =>
            isPassedForwardedStatus(project.status),
          ),
        );
      } else {
        setProjects(projectsData);
      }
      setLoading(false);
    },
    (error) => {
      console.error("Firestore Error:", error);
      // Simplified fallback to avoid index issues during role transition
      const fallbackQ =
        user?.role === "Manager" || user?.role === "Admin"
          ? query(collection(db, "projects"))
          : query(
              collection(db, "projects"),
              where("inspectorId", "==", user.uid),
            );

      fallbackUnsubscribe = onSnapshot(fallbackQ, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Keep rows visible for inspector across all status values.
        if (user?.role === "Inspector") {
          setProjects(data.filter((p) => p.inspectorId === user.uid));
        } else {
          setProjects(
            data.filter((project) =>
              isPassedForwardedStatus(project.status),
            ),
          );
        }
        setLoading(false);
      });
    }
  );

  return () => {
    unsubscribe();
    if (fallbackUnsubscribe) fallbackUnsubscribe();
  };
}, [user]);

  // Restrict Delete: Usually inspectors shouldn't delete projects, but keeping it if needed
  const handleDelete = async (projectId, name) => {
    const confirmed = await openConfirm({
      title: "Purge Assignment",
      message: "Purge this assignment?",
      confirmLabel: "Purge",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "projects", projectId));
      toast.success("Assignment deleted.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "You need admin permission to delete this assignment."));
    }
  };

  const filteredProjects = projects
    .filter(
      (p) =>
        p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || // Use clientName from setupData
        p.projectId?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort(
      (a, b) => toMillis(getRowTimestamp(a)) - toMillis(getRowTimestamp(b)),
    );

  const getInspectionActionState = (project) => {
    const status = (project?.status || "").toLowerCase();
    if (
      status.startsWith("pending confirmation") ||
      status.startsWith("in lead review") ||
      status === "completed" ||
      status.startsWith("passed and forwarded to ") ||
      status === "approved"
    ) {
      return "completed";
    }
    return "active";
  };

  const getReturnFeedback = (project) => {
    const status = (project?.status || "").toLowerCase();
    if (
      status.startsWith("returned for correction - rpt_with ") &&
      project?.returnNote
    ) {
      return project.returnNote;
    }
    return "";
  };

  const getInspectorStatusLabel = (project) => {
    const status = (project?.status || "").toLowerCase();
    if (
      status.startsWith("not started- report with ") &&
      !project?.inspectionStartedAt
    ) {
      return "New";
    }
    if (
      status.startsWith("not started- report with ") &&
      project?.inspectionStartedAt
    ) {
      return "Pending";
    }
    return project?.status || "Pending";
  };

  const getInspectionActionLabel = (project) => {
    const status = (project?.status || "").toLowerCase();
    if (status.startsWith("returned for correction - rpt_with "))
      return "Continue";
    if (project?.inspectionStartedAt) return "Continue Inspection";
    return "Start Inspection";
  };

  const handleOpenInspection = async (project) => {
    const label = getInspectionActionLabel(project);
    const assignedInspectorName =
      project?.inspectorName ||
      user?.displayName ||
      user?.name ||
      user?.email ||
      "Inspector";

    // First open only: mark inspection as started so button changes on return.
    if (label === "Start Inspection" && user?.role === "Inspector") {
      try {
        await updateDoc(doc(db, "projects", project.id), {
          inspectionStartedAt: serverTimestamp(),
          inspectionStartedBy: user?.uid || "",
          status: `In Progress - Report With ${assignedInspectorName}`,
        });
      } catch (error) {
        console.error("Failed to stamp inspection start:", error);
      }
    }

    let route = "/inspector/default-report";
    const technique = project.selectedTechnique;

    if (technique === "Visual" || technique === "Visual Testing (VT)") {
      route = "/inspector/visual-report";
    } else if (technique === "AUT" || technique === "Corrosion Mapping") {
      route = "/inspector/aut-report";
    } else if (
      technique === "Detailed" ||
      technique === "Detailed Inspection Report"
    ) {
      route = "/inspector/Detailed-report";
    }else if (
      technique === "Integrity Check" ||
      technique === "Integrity Check Report"
    ) {
      route = "/inspector/integrity-check";
    } else if (
      
      technique === "Ultrasonic Test"
    ) {
      route = "/inspector/utreport";
    } else if (technique === "MUT") {
      route = "/inspector/manual-ut-report";
    } else if (
      technique === "Piping" ||
      technique === "Piping System (P)"
    ) {
      route = "/inspector/piping-report";
    }

    navigate(route, {
      state: {
        preFill: {
          ...project,
          assetType: project.equipmentCategory || project.assetType,
        },
      },
    });

    toast.info(`Preparing the ${technique} manifest...`);
  };
  const handleViewInspection = (project) => {
    navigate(`/review/${project.id || project.projectId}`, {
      state: {
        preFill: {
          ...project,
          assetType: project.equipmentCategory || project.assetType,
        },
      },
    });
  };

  return (
    <>
      {ConfirmDialog}
      <ControlCenterTableShell
        navbar={user?.role === "Manager" ? <ManagerNavbar /> : <InspectorNavbar />}
        sidebar={user?.role === "Manager" ? <ManagerSidebar /> : <InspectorSidebar />}
        title="My Assigned Tasks"
        subtitle="Track active assignments, returned reports, and ready-for-review work."
        icon={<Briefcase size={18} />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search assignments..."
        summary={`${filteredProjects.length} Assignment${filteredProjects.length === 1 ? "" : "s"}`}
        loading={loading}
        hasData={filteredProjects.length > 0}
        emptyTitle="No Assignments Found"
        emptyDescription="Assignments routed to your profile will appear here with their workflow status and next action."
      >
        <div className="table-scroll-region max-h-[68vh] overflow-auto">
          <table className="w-full min-w-[840px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0b1326]">
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Project Identity
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Client
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Facility
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Status
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Feedback
                        </th>
                        <th className="px-3 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredProjects.map((project) => (
                        <tr
                          key={project.id}
                          className="group hover:bg-white/5 transition-colors"
                        >
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500 shadow-inner">
                                <Briefcase size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white uppercase group-hover:text-orange-500 transition-colors">
                                  {project.projectName}
                                </p>
                                <p className="text-[9px] font-mono text-slate-500 uppercase">
                                  {project.projectId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-[11px] text-slate-300 font-semibold uppercase">
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-slate-600" />
                              <div>
                                <p className="text-xs font-semibold text-slate-300 uppercase">
                                  {project.clientName}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin
                                size={14}
                                className="text-orange-500/50"
                              />
                              <span className="text-xs font-medium">
                                {project.locationName}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin
                                size={14}
                                className="text-orange-500/50"
                              />
                              <span className="text-xs font-medium">
                                {getInspectorStatusLabel(project)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <p className="text-xs text-slate-300 max-w-xs break-words">
                              {getReturnFeedback(project)}
                            </p>
                          </td>

                          <td className="px-3 py-4 text-right">
                            {getInspectionActionState(project) === "active" ? (
                              <button
                                onClick={() => handleOpenInspection(project)}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.16em] transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                              >
                                {getInspectionActionLabel(project)}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleViewInspection(project)}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.16em] transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                              >
                                View
                              </button>
                            )}
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

export default ViewInspectionsList;








