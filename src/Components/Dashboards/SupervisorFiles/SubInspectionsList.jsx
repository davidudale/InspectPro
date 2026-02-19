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
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";
import { useAuth } from "../../Auth/AuthContext";
import ManagerNavbar from "../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../ManagerFile/ManagerSidebar";

const SubInspectionsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    if (!user?.uid) return;
  
    let q;
  
    // 1. DYNAMIC QUERY SELECTION BASED ON ROLE
    // Managers and Admins see EVERYTHING with this status
    if (user?.role === "Manager" || user?.role === "Admin") {
      q = query(
        collection(db, "projects"),
        where("status", "==", "Pending Confirmation"),
        orderBy("startDate", "desc")
      );
    } 
    // Inspectors ONLY see their own specific confirmed assignments
    else {
      q = query(
        collection(db, "projects"),
        where("supervisorId", "==", user.uid),
        where("status", "==", "Pending Confirmation"),
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
        setProjects(projectsData);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        // Simplified fallback to avoid index issues during role transition
        const fallbackQ = query(
          collection(db, "projects"),
          where("status", "==", "Pending Confirmation")
        );
        onSnapshot(fallbackQ, (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Manual filter for fallback if index isn't ready
          if (user?.role === "Supervisor") {
            setProjects(data.filter(p => p.supervisorId === user.uid));
          } else {
            setProjects(data);
          }
          setLoading(false);
        });
      }
    );
  
    return () => unsubscribe();
  }, [user]);

  // --- NEW: Function to return manifest to Inspector ---
  const handleReturnToInspector = async (projectId, name) => {
    if (window.confirm(`Return "${name}" to Inspector for corrections?`)) {
      try {
        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, {
          status: "Forwarded to Inspector", // Reverting status
          lastUpdated: serverTimestamp(),
          returnNote: "Supervisor requested review/corrections",
        });
        toast.warning(`Project ${name} reverted to field status`);
      } catch (error) {
        toast.error("Status update failed: " + error.message);
      }
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {user?.role === "Manager" ? <ManagerNavbar /> : <SupervisorNavbar />}
      <div className="flex flex-1">
        {user?.role === "Manager" ? <ManagerSidebar /> : <SupervisorSidebar />}
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                  <Briefcase className="text-orange-500" /> Pending Approvals
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  Reviewing Manifests Sent for Approval
                </p>
              </div>

              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  className="w-full bg-slate-900/50 border border-slate-800 p-4 pl-12 rounded-2xl text-xs focus:border-orange-500 outline-none transition-all backdrop-blur-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Activity className="animate-spin text-orange-500" /></div>
            ) : filteredProjects.length > 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/50">
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Identity</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Client</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Facility</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredProjects.map((project) => (
                        <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                          <td className="p-6">
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
                          <td className="p-6 text-xs text-slate-300 font-semibold uppercase">{project.clientName}</td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-orange-500/50" />
                              <span className="text-xs font-medium">{project.locationName}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-orange-500/50" />
                              <span className="text-xs font-medium">{project.status}</span>
                            </div>
                          </td>

                          <td className="p-6 text-right space-x-2 item-center flex">
                            {/* NEW: Reject/Return Button */}
                            <button
                              onClick={() => handleReturnToInspector(project.id, project.projectName)}
                              className="bg-red-900/20 hover:bg-red-900/40 text-red-500 p-2 rounded-xl border border-red-500/20 transition-all group/btn"
                              title="Return to Inspector"
                            >
                              <RotateCcw size={16} className="group-active/btn:rotate-[-90deg] transition-transform" />
                            </button>

                            {/* View Report / Final Approval Button */}
                            <button
                              onClick={() => navigate("/pendinginspections", { 
                                state: { preFill: { ...project, assetType: project.equipmentCategory || project.assetType } } 
                              })}
                              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                            >
                             Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
                <ShieldAlert size={48} className="text-slate-800 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Pending Approvals</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubInspectionsList;