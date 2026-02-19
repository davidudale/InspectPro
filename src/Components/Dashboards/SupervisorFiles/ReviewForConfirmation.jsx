import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { 
  collection, doc, getDocs, serverTimestamp, updateDoc, query, where, limit 
} from "firebase/firestore";

import {
  Eye, ChevronLeft, Printer, Activity, ShieldCheck, Camera, CheckCircle
} from "lucide-react";
import AdminNavbar from "../AdminNavbar";
import AdminSidebar from "../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../Auth/AuthContext";
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";

const ReviewForConfirmation = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams(); 

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const fetchFullReport = async () => {
      setLoading(true);
      try {
        const targetId = id || location.state?.preFill?.id || location.state?.preFill?.projectId;
        
        if (!targetId) {
          toast.error("Manifest ID missing.");
          return;
        }

        // Fetch technical findings from inspection_reports
        const q = query(
          collection(db, "inspection_reports"), 
          where("general.projectId", "==", targetId), 
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          setReportData(querySnapshot.docs[0].data());
        } else {
          toast.warn("No inspection data found.");
          if (location.state?.preFill) setReportData(location.state.preFill);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Database handshake failed.");
      } finally {
        setLoading(false);
      }
    };

    fetchFullReport();
  }, [id, location.state]);

  // --- CORE ADJUSTMENT: Update Project Only ---
  const handleConfirmProject = async () => {
    const projectId = id || reportData?.general?.projectId || location.state?.preFill?.id;
    
    if (!projectId) {
      return toast.error("Technical Error: Project Reference Missing");
    }

    setIsSaving(true);
    try {
      const projectRef = doc(db, "projects", projectId);
      
      // Update ONLY the project manifest status
      await updateDoc(projectRef, {
        status: "Confirmed and Forwarded",
        confirmedBy: user?.displayName || user?.email || "Supervisor",
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success("Project Confirmed and Forwarded successfully");
      navigate("/ConfirmedInspection"); // Redirect back to list
    } catch (error) {
      console.error("Confirm Error:", error);
      toast.error(`Authorization Failure: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const evidencePhotos = reportData?.observations?.filter((obs) => obs.photoRef) || [];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Activity className="animate-spin text-orange-500" size={40} />
    </div>
  );

  if (!reportData) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {user?.role === "Admin" ? <AdminNavbar /> : <SupervisorNavbar />}
      <div className="flex flex-1">
        {user?.role === "Admin" ? <AdminSidebar /> : <SupervisorSidebar />}
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            
            <header className="flex justify-between items-center mb-10 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-orange-500 hover:bg-orange-600 transition-all shadow-inner">
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2 text-white">
                  <ShieldCheck className="text-emerald-500" /> Confirm Manifest
                </h1>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleConfirmProject} 
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-xl text-xs font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={16} /> {isSaving ? "Syncing..." : "Confirm & Forward"}
                </button>
              </div>
            </header>

            {/* General Logistics - Read Only */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StaticField label="Asset Tag" value={reportData.general?.tag} />
              <StaticField label="Category" value={reportData.general?.assetType} />
              <StaticField label="Report #" value={reportData.general?.reportNum} />
              <StaticField label="Ambient Temp" value={`${reportData.environmental?.temp || 'N/A'} °C`} />
            </div>

            {/* Technical Findings Table - Read Only */}
            <div className="space-y-4 mb-12">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 ml-2">Technical Observations</h2>
              <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden">
                {reportData.observations?.map((item) => (
                  <div key={item.sn} className="grid grid-cols-12 gap-4 p-5 border-b border-slate-800/50 items-center last:border-0 hover:bg-white/5 transition-colors">
                    <div className="col-span-1 text-[10px] font-mono text-slate-500">{item.sn}</div>
                    <div className="col-span-4 text-[11px] font-bold uppercase text-white leading-tight">{item.component}</div>
                    <div className="col-span-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.condition === 'Satisfactory' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {item.condition}
                      </span>
                    </div>
                    <div className="col-span-5 text-slate-400 text-xs italic font-medium">
                      {item.notes || "No notes."}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Gallery */}
            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
              <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                <Camera size={14} /> Technical Evidence Gallery
              </h2>
              {evidencePhotos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {evidencePhotos.map((obs, idx) => (
                    <div key={idx} className="group bg-slate-950 border border-slate-800 p-2 rounded-2xl">
                      <div className="aspect-video overflow-hidden rounded-xl bg-slate-900 mb-3 border border-slate-800">
                        <img src={obs.photoRef} className="w-full h-full object-cover" alt="Evidence" />
                      </div>
                      <div className="px-2 pb-2">
                        <span className="text-[9px] font-bold text-orange-500 uppercase">Ref {obs.sn}</span>
                        <p className="text-[10px] text-slate-400 truncate mt-1">{obs.component.split("(")[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                   <p className="text-[10px] font-bold uppercase tracking-widest">No evidence attached</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const StaticField = ({ label, value }) => (
  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-inner">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">{label}</label>
    <div className="text-sm font-bold text-white uppercase truncate">{value || "—"}</div>
  </div>
);

export default ReviewForConfirmation;