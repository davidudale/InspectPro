import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
// NEW: Import 'where' for filtering
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where } from "firebase/firestore";
import { 
  Briefcase, Search, ArrowUpRight, 
  Clock, MapPin, Users, Edit3, Trash2, ShieldAlert,
  ChevronRight, MoreVertical, Activity
} from "lucide-react";

import { toast } from "react-toastify";
import InspectorNavbar from "./InspectorNavbar";
import InspectorSidebar from "./InspectorSidebar";
import { useAuth } from "../../Auth/AuthContext"; // Ensure useAuth is imported

const ViewInspectionsList = () => {
  const { user } = useAuth(); // Get current logged-in inspector
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // --- MODIFIED QUERY: Filter by inspectorId and status ---
    const q = query(
      collection(db, "projects"), 
      where("inspectorId", "==", user.uid), // Only fetch projects assigned to THIS user
      orderBy("startDate", "desc") // Ensure you have a Firestore index for this query
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      // Fallback: If index is missing, try a simpler query
      const fallbackQ = query(collection(db, "projects"), where("inspectorId", "==", user.uid));
      onSnapshot(fallbackQ, (snap) => {
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, [user]);

  // Restrict Delete: Usually inspectors shouldn't delete projects, but keeping it if needed
  const handleDelete = async (projectId, name) => {
    if (window.confirm(`Purge this assignment?`)) {
      try {
        await deleteDoc(doc(db, "projects", projectId));
        toast.error(`Assignment purged`);
      } catch (error) {
        toast.error("Administrative permissions required for deletion.");
      }
    }
  };

  const filteredProjects = projects.filter(p => 
    p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || // Use clientName from setupData
    p.projectId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <InspectorNavbar />
      <div className="flex flex-1">
        <InspectorSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                  <Briefcase className="text-orange-500" /> My Assigned Tasks
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  Personal Worklist / Technical Deployment
                </p>
              </div>
              
              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search assignments..." 
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
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
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
                                <p className="text-sm font-bold text-white uppercase group-hover:text-orange-500 transition-colors">
                                  {project.projectName}
                                </p>
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
                          
<td className="p-6 text-right">
  <button 
    onClick={() => {
      // 1. Identify the technical route based on the selected technique
      let route = "/inspector/default-report"; // Fallback route
      
      const technique = project.selectedTechnique;

      if (technique === "Visual" || technique === "Visual Testing (VT)") {
        route = "/inspector/visual-report";
      } else if (technique === "AUT" || technique === "Corrosion Mapping") {
        route = "/inspector/aut-report";
      } else if (technique === "Manual UT" || technique === "MUT") {
        route = "/inspector/manual-ut-report";
      } else if (technique === "Piping" || technique === "Piping System (P)") {
        route = "/inspector/piping-report";
      }

      // 2. Navigate and pass the specific project manifest as preFill data
      navigate(route, { 
        state: { 
          preFill: {
            ...project,
            // Ensure assetType matches the schema keys for the useEffect hook
            assetType: project.equipmentCategory || project.assetType 
          } 
        } 
      });

      toast.info(`Initializing ${technique} Manifest...`);
    }}
    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95"
  >
    Start Inspection
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
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No assignments found</p>
                <p className="text-slate-700 text-[10px] mt-2 uppercase tracking-tighter">Please contact your admin for task forwarding</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewInspectionsList;