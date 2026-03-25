import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc, // Import updateDoc to modify existing projects
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  Briefcase,
  Search,
  MapPin,
  ShieldAlert,
  Activity,
  CheckCircle, // Icon for confirmation
  Send,
} from "lucide-react";

import { toast } from "react-toastify";
import { useAuth } from "../../Auth/AuthContext";
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";
import ControlCenterTableShell from "../../Common/ControlCenterTableShell";

const ConfirmedInspections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const isPassedForwardedStatus = (status = "") =>
    String(status).startsWith("Passed and Forwarded to ");

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch supervisor projects and filter dynamic passed/forwarded status client-side.
    const q = query(
      collection(db, "projects"),
      where("supervisorId", "==", user.uid),
      orderBy("startDate", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projectsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(
          projectsData.filter((project) =>
            isPassedForwardedStatus(project.status),
          ),
        );
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        // Fallback if index isn't ready
        const fallbackQ = query(
          collection(db, "projects"),
          where("supervisorId", "==", user.uid),
        );
        onSnapshot(fallbackQ, (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setProjects(
            data.filter((project) => isPassedForwardedStatus(project.status)),
          );
          setLoading(false);
        });
      },
    );

    return () => unsubscribe();
  }, [user]);

  // --- NEW: Function to update existing project status ---
  const handleConfirmProject = async (projectId, projectName, managerName) => {
    const projectRef = doc(db, "projects", projectId);
    const assignedManagerName = managerName || "Manager";

    try {
      toast.info(`Authorizing ${projectName}...`);

      // This UPDATES the existing project document
      await updateDoc(projectRef, {
        status: `Passed and Forwarded to ${assignedManagerName}`,
        confirmedBy: user?.displayName || user?.email,
        confirmationDate: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });

      toast.success(`Project Authorized and Forwarded to ${assignedManagerName}`);
    } catch (error) {
      console.error("Update Error:", error);
      toast.error("Failed to update project status: " + error.message);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectId?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <ControlCenterTableShell
      navbar={user?.role === "Manager" ? <ManagerNavbar /> : <SupervisorNavbar />}
      sidebar={user?.role === "Manager" ? <ManagerSidebar /> : <SupervisorSidebar />}
      title="Lead Inspector Confirmed Inspections"
      subtitle="Open finalized supervisor-reviewed reports and trace forwarded work."
      icon={<Activity size={18} />}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search confirmed inspections..."
      summary={`${filteredProjects.length} Confirmed Item${filteredProjects.length === 1 ? "" : "s"}`}
      
      loading={loading}
      hasData={filteredProjects.length > 0}
      emptyTitle="No Pending Confirmations"
      emptyDescription="Confirmed and forwarded inspections will appear here after lead review."
    >
      <div className="table-scroll-region max-h-[68vh] overflow-auto">
        <table className="w-full min-w-[800px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0b1326]">
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Project Identity
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Client
                        </th>
                        <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Status
                        </th>
                        <th className="px-3 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Technical Review
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
                                <p className="text-sm font-bold text-white uppercase">
                                  {project.projectName}
                                </p>
                                <p className="text-[9px] font-mono text-slate-500 uppercase">
                                  {project.projectId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-[11px] text-slate-300 font-semibold uppercase">
                            {project.clientName}
                          </td>
                          <td className="px-3 py-4 text-[11px] text-slate-300 font-semibold uppercase">
                            {project.status}
                          </td>

                          <td className="px-3 py-4 text-right space-x-3">
                            {/* Button to View/Review the report */}
                            <button
                              onClick={() =>
                                navigate(`/review/${project.id}`, {
                                  state: { preFill: project },
                                })
                              }
                              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all"
                            >
                              Open Report
                            </button>

                            {/* THE UPDATE BUTTON: Confirm & Forward 
                            <button
                              onClick={() => handleConfirmProject(project.id, project.projectName)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex-inline items-center gap-2"
                            >
                              <CheckCircle size={12} className="inline mr-1" /> Confirm & Forward
                            </button>*/}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
      </div>
    </ControlCenterTableShell>
  );
};

export default ConfirmedInspections;

