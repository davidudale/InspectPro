import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../Auth/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { 
  ChevronLeft, Printer, ShieldCheck, Camera, Activity, FileText 
} from "lucide-react";
import { toast } from "react-toastify";
import SupervisorNavbar from "./SupervisorNavbar";
import SupervisorSidebar from "./SupervisorSidebar";

const ReviewReport = () => {
  const { id } = useParams(); // Gets projectId from the URL
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        // Query the inspection_reports collection for a document linked to this projectId
        const q = query(
          collection(db, "inspection_reports"),
          where("general.projectId", "==", id),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setReportData(querySnapshot.docs[0].data());
        } else {
          toast.error("Technical findings not found for this manifest.");
        }
      } catch (error) {
        console.error("Error fetching report:", error);
        toast.error("Handshake Failure: Could not retrieve report data.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReport();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Activity className="animate-spin text-orange-500" size={40} />
    </div>
  );

  if (!reportData) return (
    <div className="min-h-screen bg-slate-950 text-white p-10 text-center">
      <p>Report data unavailable.</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-orange-500">Go Back</button>
    </div>
  );

  const evidencePhotos = reportData?.observations?.filter((obs) => obs.photoRef) || [];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      {user?.role === "Admin" ? <AdminNavbar /> : <SupervisorNavbar />}
      <div className="flex flex-1">
        {user?.role === "Admin" ? <AdminSidebar /> : <SupervisorSidebar />}
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-orange-500 hover:bg-orange-600 transition-all shadow-inner">
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                  <FileText className="text-orange-500" /> Technical Report Review
                </h1>
              </div>
              {/* <button onClick={() => window.print()} className="bg-slate-800 px-6 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all flex items-center gap-2">
                <Printer size={14} /> Print Archive
              </button> */}
            </header>

            {/* General Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <ReadOnlyField label="Asset Tag" value={reportData.general?.tag} />
              <ReadOnlyField label="Client" value={reportData.general?.client} />
              <ReadOnlyField label="Technique" value={reportData.technique} />
              <ReadOnlyField label="Inspector" value={reportData.inspector} />
            </div>

            {/* Findings List */}
            <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden mb-12 shadow-2xl">
              <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Technical Observations</h2>
              </div>
              <div className="divide-y divide-slate-800/50">
                {reportData.observations?.map((obs) => (
                  <div key={obs.sn} className="grid grid-cols-12 gap-4 p-6 hover:bg-white/5 transition-colors">
                    <div className="col-span-1 text-[10px] font-mono text-slate-500">{obs.sn}</div>
                    <div className="col-span-4 text-[11px] font-bold uppercase text-white">{obs.component}</div>
                    <div className="col-span-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${obs.condition === 'Satisfactory' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {obs.condition}
                      </span>
                    </div>
                    <div className="col-span-5 text-slate-400 text-xs italic">
                      {obs.notes || "No additional technical remarks."}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Gallery */}
            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
              <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                <Camera size={14} /> Photographic Appendix
              </h2>
              {evidencePhotos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {evidencePhotos.map((photo, idx) => (
                    <div key={idx} className="bg-slate-950 p-2 rounded-2xl border border-slate-800 shadow-xl">
                      <img src={photo.photoRef} className="aspect-video object-cover rounded-xl w-full mb-2" alt="Evidence" />
                      <p className="text-[9px] text-center text-slate-500 uppercase font-bold">Ref {photo.sn}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-600 italic text-sm font-medium">No photographic evidence attached.</div>
              )}
            </div>
          </div>
        </main>
        
      </div>
    </div>
  );
};

const ReadOnlyField = ({ label, value }) => (
  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-inner">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">{label}</label>
    <div className="text-sm font-bold text-white uppercase tracking-tight">{value || "—"}</div>
  </div>
);

export default ReviewReport;