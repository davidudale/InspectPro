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

const ConfirmedInspections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // --- FIXED QUERY: Use separate where clauses ---
    // Note: status filter is set to "Pending Confirmation" based on previous workflow
    const q = query(
      collection(db, "projects"),
      where("supervisorId", "==", user.uid),
      where("status", "==", "Confirmed and forwarded"),
      orderBy("startDate", "desc"),
    );

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
        // Fallback if index isn't ready
        const fallbackQ = query(
          collection(db, "projects"),
          where("status", "==", "Confirmed and Forwarded"),
        );
        onSnapshot(fallbackQ, (snap) => {
          setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
      },
    );

    return () => unsubscribe();
  }, [user]);

  // --- NEW: Function to update existing project status ---
  const handleConfirmProject = async (projectId, projectName) => {
    const projectRef = doc(db, "projects", projectId);

    try {
      toast.info(`Authorizing ${projectName}...`);

      // This UPDATES the existing project document
      await updateDoc(projectRef, {
        status: "Confirmed and Forwarded",
        confirmedBy: user?.displayName || user?.email,
        confirmationDate: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });

      toast.success("Project Authorized and Forwarded");
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
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {user?.role === "Manager" ? <ManagerNavbar /> : <SupervisorNavbar />}
      <div className="flex flex-1">
        {user?.role === "Manager" ? <ManagerSidebar /> : <SupervisorSidebar />}
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                  <Activity className="text-orange-500" />
                  Supervisor Confirmed Inspections
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  Completed Inspections as Supervised
                </p>
              </div>

              <div className="relative w-full md:w-80 group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-full bg-slate-900/50 border border-slate-800 p-4 pl-12 rounded-2xl text-xs focus:border-orange-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </header>

            {loading ? (
              <div className="flex justify-center py-20">
                <Activity className="animate-spin text-orange-500" />
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/50">
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Project Identity
                        </th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Client
                        </th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Status
                        </th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
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
                          <td className="p-6">
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
                          <td className="p-6 text-xs text-slate-300 font-semibold uppercase">
                            {project.clientName}
                          </td>
                          <td className="p-6 text-xs text-slate-300 font-semibold uppercase">
                            {project.status}
                          </td>

                          <td className="p-6 text-right space-x-3">
                            {/* Button to View/Review the report */}
                            <button
                              onClick={() =>
                                navigate(`/review/${project.id}`, {
                                  state: { preFill: project },
                                })
                              }
                              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
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
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
                <ShieldAlert size={48} className="text-slate-800 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
                  No pending confirmations
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ConfirmedInspections;
