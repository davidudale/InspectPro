import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
  Briefcase, Save, ArrowLeft, Shield, 
  MapPin, Users, Activity, Clock 
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";

const ProjectEdit = () => {
  const { projectId } = useParams(); // URL param if accessing via direct link
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize state with empty manifest structure
  const [projectData, setProjectData] = useState({
    projectName: "",
    client: "",
    location: "",
    status: "Planned",
    startDate: "",
    projectId: ""
  });

  useEffect(() => {
    const fetchProjectDetails = async () => {
      // Priority 1: Check if data was passed via route state (from ProjectList)
      if (location.state?.project) {
        setProjectData(location.state.project);
        setLoading(false);
        return;
      }

      // Priority 2: Fetch from Firestore using URL ID
      try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProjectData({ id: docSnap.id, ...docSnap.data() });
        } else {
          toast.error("Manifest not found in database");
          navigate("/viewprojects");
        }
      } catch (error) {
        toast.error("Failed to sync project data");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [projectId, location.state, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const docRef = doc(db, "projects", projectData.id);
      await updateDoc(docRef, {
        ...projectData,
        lastUpdated: serverTimestamp()
      });
      
      toast.success("Operational Manifest Updated");
      navigate("/viewprojects");
    } catch (error) {
      toast.error("Update failed: Check permissions");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-slate-950 text-orange-500">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-4xl mx-auto">
            
            {/* Header Navigation */}
            <div className="flex items-center justify-between mb-10 border-b border-slate-900 pb-8">
              <div>
                <button 
                  onClick={() => navigate("/admin/projects")}
                  className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors text-[10px] font-bold uppercase tracking-widest mb-4"
                >
                  <ArrowLeft size={14} /> Back to Directory
                </button>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                  <Shield className="text-orange-500" /> Modify Manifest
                </h1>
              </div>
              <div className="text-right">
                <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.3em]">Revision Control</p>
                <p className="text-white font-mono text-xs">{projectData.projectId}</p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Primary Context Section */}
              <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md shadow-xl">
                <h2 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <Briefcase size={14}/> 1. Core Project Identity
                </h2>
                
                <div className="space-y-6">
                  <EditInput 
                    label="Manifest Name" 
                    value={projectData.projectName} 
                    onChange={(val) => setProjectData({...projectData, projectName: val})} 
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <EditInput 
                      label="Corporate Client" 
                      value={projectData.client} 
                      onChange={(val) => setProjectData({...projectData, client: val})} 
                    />
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Operational Status</label>
                      <select 
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none transition-all"
                        value={projectData.status}
                        onChange={(e) => setProjectData({...projectData, status: e.target.value})}
                      >
                        <option value="Planned">Planned</option>
                        <option value="In-Progress">In-Progress</option>
                        <option value="On-Hold">On-Hold</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics Section */}
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                <h2 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <MapPin size={14}/> 2. Field Logistics
                </h2>
                <EditInput 
                  label="Facility Location" 
                  value={projectData.location} 
                  onChange={(val) => setProjectData({...projectData, location: val})} 
                />
              </div>

              {/* Scheduling Section */}
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md">
                <h2 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <Clock size={14}/> 3. Timeline
                </h2>
                <EditInput 
                  label="Deployment Date" 
                  type="date"
                  value={projectData.startDate} 
                  onChange={(val) => setProjectData({...projectData, startDate: val})} 
                />
              </div>

              {/* Submit Section */}
              <div className="md:col-span-2 pt-4">
                <button 
                  disabled={isUpdating}
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 rounded-[2rem] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-2xl shadow-orange-900/20 active:scale-95"
                >
                  {isUpdating ? "Synchronizing..." : "Update Manifest Changes"}
                  <Save size={18} />
                </button>
              </div>

            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

// Reusable Sub-component for form fields
const EditInput = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type}
      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none transition-all shadow-inner"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default ProjectEdit;
