import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  ShieldCheck, Activity, Ruler, Camera, ChevronLeft, CheckCircle2,
  XCircle, FileText, Printer, Save, Plus, Trash2, Zap
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

const Aut = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [reportMode, setReportMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Consolidated state mapped to the technical manifest
  const [reportData, setReportData] = useState({
    schematics: [], 
    images: [],
    general: { platform: "", equipment: "", tag: "", reportNum: "", date: "", client: "", workOrder: "", clientLogo: "" },
    autTechnique: { introduction: "AUT Hydroform mapping utilizing phased array ultrasonic testing...", equipmentModel: "", probeType: "", limitations: "" },
    vesselData: { serialNo: "", designPressure: "", testPressure: "", mdmt: "", allowablePressure: "", shellThk: "", headThk: "", vesselDia: "", manufactureYear: "", poNo: "" },
    visualObservations: [
      { sn: "3.1.1", component: "Shell And Transition Cone", observation: "", photoRef: "" },
      { sn: "3.1.2", component: "Lower Head", observation: "", photoRef: "" },
      { sn: "3.1.3", component: "Upper Head", observation: "", photoRef: "" },
      { sn: "3.1.4", component: "Nozzles And Man way", observation: "", photoRef: "" }
    ],
    auxiliaryObservations: [
      { sn: "3.2.1", component: "Platforms And Handrails", observation: "", photoRef: "" },
      { sn: "3.2.2", component: "Foundation & Bolts", observation: "", photoRef: "" }
    ],
    instrumentationObservations: [
      { sn: "3.3.1", component: "Level Gauges", observation: "", photoRef: "" },
      { sn: "3.3.2", component: "Pressure Gauges", observation: "", photoRef: "" }
    ],
    summary: { visual: "", aut: "", conclusions: "", fitForService: "Yes" }
  });

  useEffect(() => {
    if (location.state?.preFill) {
      const p = location.state.preFill;
      setReportData((prev) => ({
        ...prev,
        general: { ...prev.general, ...p, date: new Date().toISOString().split("T")[0] },
      }));
    }
  }, [location.state]);

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, "inspection_reports"), {
        ...reportData,
        inspector: user?.displayName || "Technical Lead",
        timestamp: serverTimestamp(),
      });
      toast.success("Inspection Synchronized");
      setReportMode(true); // Switch to Web Viewer automatically
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- SUB-COMPONENT: WEB VIEW (PRINTABLE REPORT) ---
  const WebView = () => {
    const PageHeader = () => (
      <div className="grid grid-cols-[1fr_2fr_1fr] border-2 border-slate-900 mb-6 text-center items-center font-bold">
        <div className="border-r-2 border-slate-900 p-2 h-16 flex items-center justify-center bg-slate-50">
           {reportData.general.clientLogo ? <img src={reportData.general.clientLogo} className="max-h-full object-contain" alt="Client"/> : "CLIENT"}
        </div>
        <div className="p-2 space-y-1 text-black">
          <div className="text-[10px] uppercase tracking-widest">{reportData.general.platform}</div>
          <div className="text-[11px] uppercase font-black">{reportData.general.equipment} ({reportData.general.tag})</div>
        </div>
        <div className="border-l-2 border-slate-900 p-2 text-[10px] text-blue-800 uppercase flex items-center justify-center font-black">
          INSPECTPRO™
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-100 py-10 no-scrollbar overflow-y-auto font-sans">
        <div className="fixed right-10 top-10 flex flex-col gap-4 no-print z-50">
          <button onClick={() => window.print()} className="bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><Printer size={24}/></button>
          <button onClick={() => setReportMode(false)} className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><XCircle size={24}/></button>
        </div>

        [cite_start]{/* PAGE 1: COVER [cite: 1, 3, 5, 7] */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-20 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page" style={{ breakAfter: 'page' }}>
           <div className="flex justify-between items-center mb-20 uppercase font-black text-xl italic text-slate-900">
             Technical Manifest
             <div className="text-blue-900">InspectPro</div>
           </div>
           <div className="text-center flex-1">
              <h1 className="text-4xl font-serif font-bold underline mb-4 uppercase text-black">{reportData.general.platform}</h1>
              <h2 className="text-2xl font-bold mb-10 uppercase tracking-widest text-black">AUT Corrosion Mapping Report</h2>
              <div className="w-full aspect-video bg-slate-100 border-2 border-slate-900 mx-auto mb-10 flex items-center justify-center overflow-hidden">
                 {reportData.images[0] ? <img src={reportData.images[0].url} className="w-full h-full object-cover" alt="Primary Asset"/> : <Activity size={80} className="text-slate-200"/>}
              </div>
              <div className="space-y-4 text-left inline-block font-bold text-black">
                <p className="text-sm uppercase">Report Ref: <span className="font-normal">{reportData.general.reportNum}</span></p>
                <p className="text-sm uppercase">Asset Tag: <span className="font-normal">{reportData.general.tag}</span></p>
                <p className="text-sm uppercase">Date: <span className="font-normal">{reportData.general.date}</span></p>
              </div>
           </div>
           <div className="mt-auto border-t-4 border-slate-900 pt-6 text-center text-[10px] font-black text-red-600 tracking-[0.3em]">CONFIDENTIAL ENGINEERING DOCUMENT</div>
        </div>

        [cite_start]{/* PAGE 2: VESSEL DATA [cite: 21] */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl mb-10 min-h-[1100px]">
          <PageHeader />
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-6 tracking-widest">2.0 Vessel Specification Data</h3>
          <table className="w-full border-collapse border-2 border-slate-900 text-[11px]">
            <tbody>
              {Object.entries(reportData.vesselData).map(([key, value]) => (
                <tr key={key} className="border-b border-slate-900 text-black">
                  <td className="p-3 bg-slate-50 font-bold uppercase border-r-2 border-slate-900 w-1/3">{key.replace(/([A-Z])/g, ' $1')}</td>
                  <td className="p-3">{value || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-10 pt-4 flex justify-between text-[9px] font-bold border-t border-slate-900 uppercase text-black">
             <div>Ref: {reportData.general.reportNum}</div>
             <div>Page 2 of 4</div>
          </div>
        </div>
      </div>
    );
  };

  if (reportMode) return <WebView />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-orange-500 hover:bg-orange-600 transition-all"><ChevronLeft size={20}/></button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2"><Zap className="text-orange-500" /> API 510 Workflow</h1>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setReportMode(true)} className="bg-slate-800 px-6 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all">Preview</button>
                <button onClick={handleSaveToFirebase} disabled={isSaving} className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg hover:bg-orange-700 transition-all">
                  <Save size={14} /> {isSaving ? "Syncing..." : "Finalize Manifest"}
                </button>
              </div>
            </header>

            <div className="flex border-b border-slate-800 mb-8 gap-6 overflow-x-auto pb-2 scrollbar-hide">
              {["general", "vesselData", "visual", "photos", "autMetrics", "schematics", "shearWave"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab ? "text-orange-500 border-b-2 border-orange-500 pb-2" : "text-slate-500"}`}>
                  {tab === "vesselData" ? "2. Vessel Data" : tab === "visual" ? "3. Visual Inspection" : tab.replace(/([A-Z])/g, " $1")}
                </button>
              ))}
            </div>

            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 backdrop-blur-sm min-h-[400px]">
              {activeTab === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  <InputField label="Client Portfolio" value={reportData.general.client} onChange={(v) => setReportData({ ...reportData, general: { ...reportData.general, client: v } })} />
                  <InputField label="Operational Platform" value={reportData.general.platform} onChange={(v) => setReportData({ ...reportData, general: { ...reportData.general, platform: v } })} />
                  <InputField label="Asset Tag Number" value={reportData.general.tag} onChange={(v) => setReportData({ ...reportData, general: { ...reportData.general, tag: v } })} />
                </div>
              )}

              {activeTab === "vesselData" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  {Object.keys(reportData.vesselData).map((field) => (
                    <InputField key={field} label={field.replace(/([A-Z])/g, ' $1')} value={reportData.vesselData[field]} onChange={(v) => setReportData({ ...reportData, vesselData: { ...reportData.vesselData, [field]: v } })} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- GLOBAL SHARED COMPONENT (Fixes ReferenceError) ---
const InputField = ({ label, value, onChange, type = "text", readOnly = false }) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <input type={type} value={value} readOnly={readOnly} onChange={(e) => onChange && onChange(e.target.value)}
      className={`bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none transition-all shadow-inner ${readOnly ? "opacity-50 cursor-not-allowed border-slate-900" : ""}`}
    />
  </div>
);

export default Aut;