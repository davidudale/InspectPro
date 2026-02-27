import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import {
  ArrowLeft, Clock, User, Activity, Hash, ShieldCheck,
  ChevronRight, Database, MapPin, Building2, Lock,
  Camera, Printer, XCircle, FileText, Layout
} from "lucide-react";

const ViewInspection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportMode, setReportMode] = useState(false); // Toggle for Web Report View

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const docRef = doc(db, "inspections", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching manifest:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handlePhotoUpload = async (e, itemIndex) => {
    const file = e.target.files[0];
    if (!file) return;

    // Implementation Note: In a production environment, you would upload to Firebase Storage 
    // and save the URL. For this structure, we use a placeholder toast.
    toast.info("Uploading evidence to secure cloud...");
    
    // Simulate successful upload and update local state
    const updatedItems = [...data.items];
    updatedItems[itemIndex].evidenceUrl = URL.createObjectURL(file); // Temporary preview
    setData({ ...data, items: updatedItems });
  };

  // --- SUB-COMPONENT: WEB REPORT VIEW (PAGINATED STYLE) ---
  const WebReportView = () => {
    return (
      <div className="min-h-screen bg-slate-100 py-10 no-scrollbar overflow-y-auto font-sans text-slate-900">
        <div className="fixed right-10 top-10 flex flex-col gap-4 no-print z-50">
          <button onClick={() => window.print()} className="bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all">
            <Printer size={24} />
          </button>
          <button onClick={() => setReportMode(false)} className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all">
            <XCircle size={24} />
          </button>
        </div>

        {/* PAGE 1: COVER SHEET [cite: 1, 3, 5] */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-20 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page" style={{ breakAfter: 'page' }}>
           <div className="flex justify-between items-center mb-20 uppercase font-black text-xl italic border-b-4 border-slate-900 pb-4">
             Inspection Record [cite: 1]
             <div className="text-blue-900">INSPECTPRO [cite: 2]</div>
           </div>
           <div className="text-center flex-1">
              <h1 className="text-4xl font-serif font-bold underline mb-4 uppercase text-slate-800">Operational Log</h1>
              <h2 className="text-2xl font-bold mb-10 tracking-[0.2em] uppercase">Visual Testing (VT) Summary [cite: 3]</h2>
              <div className="w-full aspect-video bg-slate-100 border-2 border-slate-900 mx-auto mb-10 flex items-center justify-center overflow-hidden shadow-inner">
                 {data?.items?.[0]?.evidenceUrl ? (
                   <img src={data.items[0].evidenceUrl} className="w-full h-full object-cover" alt="Primary Evidence"/>
                 ) : (
                   <Activity size={120} className="text-slate-200" />
                 )}
              </div>
              <div className="space-y-4 text-left inline-block font-bold border-l-4 border-orange-500 pl-6">
                <p className="text-sm uppercase tracking-wider">Report Ref: <span className="font-normal text-slate-500">{id.substring(0,8)}</span> [cite: 4]</p>
                <p className="text-sm uppercase tracking-wider">Asset Range: <span className="font-normal text-slate-500">{data?.items?.[0]?.reference}</span> [cite: 5, 12]</p>
                <p className="text-sm uppercase tracking-wider">Auth Date: <span className="font-normal text-slate-500">{data?.timestamp?.toDate().toLocaleDateString()}</span> [cite: 6]</p>
              </div>
           </div>
           <div className="mt-auto border-t-4 border-slate-900 pt-6 text-center text-[10px] font-black text-red-600 tracking-[0.3em]">CONFIDENTIAL ENGINEERING DOCUMENT [cite: 7]</div>
        </div>

        {/* PAGE 2: LOGISTICS & EVIDENCE GRID [cite: 8, 9, 63] */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl min-h-[1100px] flex flex-col print:m-0">
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-8 tracking-widest">1.0 Photographic Evidence & Technical Detail [cite: 9]</h3>
          <div className="grid grid-cols-2 gap-8 mb-10">
            {data?.items?.map((item, idx) => (
              <div key={idx} className="space-y-3 border border-slate-200 p-4 rounded-lg bg-slate-50">
                 <div className="aspect-video bg-white border border-slate-300 rounded flex items-center justify-center overflow-hidden">
                    {item.evidenceUrl ? <img src={item.evidenceUrl} className="w-full h-full object-cover" alt="Log Evidence"/> : <Camera className="text-slate-200"/>}
                 </div>
                 <div className="text-[10px] space-y-1">
                    <p className="font-black uppercase text-slate-700">Ref: {item.reference} [cite: 12]</p>
                    <p className="text-slate-500 italic uppercase tracking-tighter">Method: {item.type} [cite: 63]</p>
                 </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4 flex justify-between text-[9px] font-bold border-t border-slate-900 uppercase">
             <div>InspectPro Archive: {id}</div>
             <div>Page 2 of 2 </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex h-screen bg-slate-950 items-center justify-center"><Activity className="animate-spin text-orange-500" /></div>;
  if (reportMode) return <WebReportView />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-5xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div>
                <button onClick={() => navigate("/admin/inspections")} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 mb-4 transition-all">
                  <ArrowLeft size={18} /> Return to Registry
                </button>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Archive Manifest</h1>
              </div>
              <button onClick={() => setReportMode(true)} className="bg-orange-600 px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-orange-700 shadow-xl shadow-orange-900/20 transition-all active:scale-95">
                <Layout size={18} /> Web Report View
              </button>
            </header>

            <div className="grid grid-cols-1 gap-6">
              {data?.items?.map((item, index) => (
                <div key={index} className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col lg:flex-row gap-8 items-start group">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center font-mono text-xs text-orange-500">0{index + 1}</span>
                      <h3 className="text-2xl font-bold uppercase text-white">{item.type} [cite: 63]</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                       <Detail label="Tag Ref" value={item.reference} icon={<Hash />} />
                       <Detail label="Facility" value={item.Location} icon={<MapPin />} />
                       <Detail label="Client" value={item.Client} icon={<Building2 />} />
                    </div>
                  </div>

                  <div className="w-full lg:w-64 space-y-4">
                    <label className="cursor-pointer block">
                      <div className="border-2 border-dashed border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-slate-500">
                         {item.evidenceUrl ? (
                           <img src={item.evidenceUrl} className="h-20 w-full object-cover rounded-xl mb-2" alt="Evidence Preview" />
                         ) : (
                           <Camera size={32} className="mb-2" />
                         )}
                         <span className="text-[10px] font-bold uppercase tracking-widest">{item.evidenceUrl ? "Change Photo" : "Upload Evidence"}</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, index)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const Detail = ({ label, value, icon }) => (
  <div className="flex items-start gap-3">
    <div className="text-slate-600 mt-1">{icon}</div>
    <div>
      <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest">{label}</p>
      <p className="text-sm text-slate-300 font-bold">{value || "N/A"}</p>
    </div>
  </div>
);

export default ViewInspection;
