import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { 
  ShieldCheck, Activity, Ruler, Camera, 
  ChevronLeft, CheckCircle2, XCircle, FileText, Printer, Save, Plus, Trash2
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
  const [existingReportId, setExistingReportId] = useState(null);

  const [reportData, setReportData] = useState({
    general: { 
      platform: "", equipment: "", tag: "", reportNum: "", date: "",
      client: "", contract: "", procedure: "", testCode: "API 510", criteria: "Client's Requirement",
      projectId: ""
    },
    vesselData: { 
      serialNo: "", designPressure: "", testPressure: "", mdmt: "",
      shellThk: "", headThk: "", size: "", manufactureYear: "", vesselDia: "" 
    },
    visual: { 
      shell: "Satisfactory", nozzles: "Satisfactory", skirt: "Satisfactory", 
      heads: "Satisfactory", insulation: "Satisfactory", foundation: "Satisfactory" 
    },
    autMetrics: [{ id: Date.now(), axialX: "0", axialY: "0", nominal: "12.5", min: "12.5", location: "", remark: "" }],
    mutNozzles: [{ id: Date.now(), nozzleTag: "", dia: "", nominal: "", actual: "", minThk: "" }],
    shearWave: [{ id: Date.now(), nozzleNo: "", discontinuity: "", depth: "", result: "Accept" }],
    // Added summary object with defaults to prevent WebView crash
    summary: { 
      visual: "", aut: "", nozzles: "", manway: "", circWeld: "", 
      nozzleWeld: "", manwayWeld: "", conclusions: "", fitForService: "Yes" 
    },
    images: [] 
  });

  useEffect(() => {
    const initializeManifest = async () => {
      if (!location.state?.preFill) return;

      const p = location.state.preFill;
      const projectKey = p.id || p.projectId || "";

      // Bootstrap from assigned project details first.
      setReportData((prev) => ({
        ...prev,
        general: {
          ...prev.general,
          tag: p.equipmentTag || p.tag || "",
          equipment: p.equipmentCategory || p.assetType || p.equipment || "",
          platform: p.locationName || p.location || "",
          client: p.clientName || p.client || "",
          reportNum: p.reportNum || p.reportNo || "",
          date: new Date().toISOString().split("T")[0],
          projectId: projectKey,
        },
      }));

      if (!projectKey) return;

      // If a previous draft/report exists (e.g. returned for correction), load it.
      const existingQuery = query(
        collection(db, "inspection_reports"),
        where("general.projectId", "==", projectKey),
        limit(1),
      );
      const snapshot = await getDocs(existingQuery);

      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        setExistingReportId(existingDoc.id);
        setReportData(existingDoc.data());
        toast.info("Previous inspection details loaded for correction.");
      }
    };

    initializeManifest();
  }, [location.state]);

  // Fixed syntax error by properly closing preceding function
  const updateRow = (id, field, val, table) => {
    const updated = reportData[table].map(row => row.id === id ? { ...row, [field]: val } : row);
    setReportData({ ...reportData, [table]: updated });
  };

  const getStatus = (nominal, min) => {
    const loss = nominal ? ((nominal - min) / nominal) * 100 : 0;
    return loss > 12.5 ? "REJECT" : "ACCEPT"; // Based on 12.5% mill tolerance [cite: 13]
  };

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...reportData,
        inspector: user?.displayName || "Technical Lead",
        timestamp: serverTimestamp(),
      };

      if (existingReportId) {
        await updateDoc(doc(db, "inspection_reports", existingReportId), payload);
      } else {
        const created = await addDoc(collection(db, "inspection_reports"), payload);
        setExistingReportId(created.id);
      }
      toast.success("Inspection Data Saved to Firebase");
      setReportMode(true); 
    } catch (error) {
      toast.error("Error saving report: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (reportMode) {
    return <WebView reportData={reportData} setReportMode={setReportMode} user={user} getStatus={getStatus} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg hover:text-orange-500 transition-colors"><ChevronLeft size={20} /></button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                   <ShieldCheck className="text-orange-500" /> API 510 Inspection Hub
                </h1>
              </div>
              <button onClick={handleSaveToFirebase} disabled={isSaving} className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 shadow-lg disabled:opacity-50">
                <Save size={14} /> {isSaving ? "Saving..." : "Submit for Review"}
              </button>
            </header>

            <div className="flex border-b border-slate-800 mb-8 gap-6 overflow-x-auto pb-2 scrollbar-hide">
              {['general', 'vesselData', 'visual', 'autMetrics', 'nozzleMut', 'shearWave'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab ? "text-orange-500 border-b-2 border-orange-500 pb-2" : "text-slate-500"}`}>
                  {tab === 'vesselData' ? '2. Vessel Data' : tab === 'autMetrics' ? '5. AUT Mapping' : tab === 'nozzleMut' ? '6. Nozzle MUT' : tab === 'shearWave' ? '7. Shear Wave' : tab.replace(/([A-Z])/g, ' $1')}
                </button>
              ))}
            </div>

            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-md">
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  <InputField label="Client" value={reportData.general.client} onChange={(v) => setReportData({...reportData, general: {...reportData.general, client: v}})} />
                  <InputField label="Platform" value={reportData.general.platform} onChange={(v) => setReportData({...reportData, general: {...reportData.general, platform: v}})} />
                  <InputField label="Tag Number" value={reportData.general.tag} onChange={(v) => setReportData({...reportData, general: {...reportData.general, tag: v}})} />
                </div>
              )}
              {/* Add other tab content here as we progress... */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- TECHNICAL WEB REPORT VIEW ---
const WebView = ({ reportData, setReportMode, user, getStatus }) => {
  // Page Header Helper for subsequent pages
  const PageHeader = () => (
    <div className="grid grid-cols-[1fr_2fr_1fr] border border-slate-900 mb-6 text-center items-center font-bold">
      <div className="border-r border-slate-900 p-2 text-[10px] uppercase">Client Logo [cite: 1]</div>
      <div className="p-2 space-y-1">
        <div className="text-xs uppercase">{reportData.general.platform || "PLATFORM NAME"} [cite: 3]</div>
        <div className="text-xs uppercase">{reportData.general.equipment} ({reportData.general.tag}) [cite: 5]</div>
      </div>
      <div className="border-l border-slate-900 p-2 text-[10px] text-blue-700 uppercase">Company Logo [cite: 2]</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 p-12 font-serif selection:bg-orange-200">
      
      {/* PAGE 1: COVER PAGE */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative flex flex-col mb-12">
        <div className="text-center">
          <div className="flex justify-between items-start mb-20">
            <div className="text-lg font-bold uppercase">Client Logo [cite: 1]</div>
            <div className="text-lg font-bold uppercase">Company Logo [cite: 2]</div>
          </div>
          <h1 className="text-2xl font-bold underline uppercase mb-8 tracking-widest">{reportData.general.platform} [cite: 4]</h1>
          <h2 className="text-xl font-bold uppercase mb-4">CORROISON MAPPING INSPECTION REPORT [cite: 4]</h2>
          <h3 className="text-lg font-bold uppercase mb-20">{reportData.general.equipment} & {reportData.general.tag} [cite: 5]</h3>
          <div className="border border-slate-900 w-64 h-48 mx-auto flex items-center justify-center mb-24 bg-slate-50 text-[10px] font-bold">PHOTO OF EQUIPMENT [cite: 6]</div>
          <div className="space-y-4 font-bold">
            <p className="text-red-600 text-sm">WORK ORDER #: {reportData.general.workOrder} [cite: 7]</p>
            <p className="text-sm uppercase">REPORT#: {reportData.general.reportNum} [cite: 8]</p>
            <p className="text-sm uppercase">DATE: {reportData.general.date} [cite: 9]</p>
            <p className="text-sm uppercase tracking-[0.3em] mt-8 tracking-widest font-bold">ORIGINAL [cite: 10]</p>
          </div>
        </div>
        <div className="mt-auto pt-10 text-center">
          <p className="text-red-600 text-sm font-bold underline uppercase tracking-widest">({reportData.general.client}) USE ONLY [cite: 11]</p>
        </div>
      </div>

      {/* PAGE 2: INTRODUCTION & TOC */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12">
        <PageHeader />
        <table className="w-full text-[10px] border-collapse border border-slate-900 mb-8">
          <tbody>
            <tr><td className="border border-slate-900 p-1 bg-slate-50 font-bold">Client: [cite: 13]</td><td className="border border-slate-900 p-1">{reportData.general.client}</td><td className="border border-slate-900 p-1 bg-slate-50 font-bold">Report Number: [cite: 13]</td><td className="border border-slate-900 p-1">{reportData.general.reportNum}</td></tr>
            <tr><td className="border border-slate-900 p-1 bg-slate-50 font-bold">Location: [cite: 13]</td><td className="border border-slate-900 p-1">{reportData.general.platform}</td><td className="border border-slate-900 p-1 bg-slate-50 font-bold">Contract Number: [cite: 13]</td><td className="border border-slate-900 p-1">{reportData.general.contract}</td></tr>
            <tr><td className="border border-slate-900 p-1 bg-slate-50 font-bold">Test Code: [cite: 13]</td><td className="border border-slate-900 p-1">API 510</td><td className="border border-slate-900 p-1 bg-slate-50 font-bold">Inspected By: [cite: 13]</td><td className="border border-slate-900 p-1">{user?.displayName || "Admin"}</td></tr>
          </tbody>
        </table>
        <div className="mb-10 text-[11px] leading-relaxed">
          <h3 className="font-bold underline uppercase mb-2">INTRODUCTION: [cite: 17]</h3>
          <p>At the request of <span className="text-red-600 font-bold">{reportData.general.client} Department [cite: 18]</span>, Corrosion Mapping Inspection was carried out on <span className="text-red-600 font-bold">{reportData.general.equipment} ({reportData.general.tag}) [cite: 18]</span> at <span className="text-red-600 font-bold">{reportData.general.platform} platform [cite: 19]</span>.</p>
        </div>
        <h3 className="font-bold text-sm mb-4">CONTENTS [cite: 20]</h3>
        <table className="w-full text-xs border-collapse border border-slate-900">
          <thead className="bg-slate-100">
            <tr><th className="border border-slate-900 p-2">S/N [cite: 21]</th><th className="border border-slate-900 p-2">Description [cite: 21]</th><th className="border border-slate-900 p-2">Page No. [cite: 21]</th></tr>
          </thead>
          <tbody>
            {[{ sn: "1", desc: "Executive Summary" }, { sn: "2", desc: "Vessel General Data" }, { sn: "3", desc: "External Visual Inspection" }].map(item => (
              <tr key={item.sn}><td className="border border-slate-900 p-2 text-center">{item.sn}</td><td className="border border-slate-900 p-2">{item.desc}</td><td className="border border-slate-900 p-2 text-center">{parseInt(item.sn)+2}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGE 3: EXECUTIVE SUMMARY */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12 flex flex-col">
        <PageHeader />
        <div className="flex-1">
          <h2 className="font-bold text-sm underline uppercase mb-6">1. EXECUTIVE SUMMARY OF INSPECTION RESULTS [cite: 27]</h2>
          <div className="mb-8"><h3 className="font-bold text-xs mb-2">1.1 Visual Inspection [cite: 28]</h3><div className="min-h-[60px] p-2 border border-slate-200 text-xs italic text-slate-500">{reportData.summary?.visual || "Pending..."}</div></div>
          <div className="mb-8"><h3 className="font-bold text-xs mb-2">1.2 AUT Inspection [cite: 30]</h3><p className="text-[10px] italic mb-2">Ref: Page 20 AUT Scan Thickness Data Overview [cite: 31]</p><div className="min-h-[60px] p-2 border border-slate-200 text-xs italic text-slate-500">{reportData.summary?.aut || "Pending..."}</div></div>
        </div>
        <div className="border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
          <div>Report Number: {reportData.general.reportNum} [cite: 41]</div>
          <div>Page 3 of 16 [cite: 42]</div>
        </div>
      </div>

      <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 no-print">
        <button onClick={() => window.print()} className="bg-blue-600 text-white p-3 rounded-full shadow-xl hover:bg-blue-700 transition-all"><Printer size={20}/></button>
        <button onClick={() => setReportMode(false)} className="bg-slate-800 text-white p-3 rounded-full shadow-xl hover:bg-slate-700 transition-all"><ChevronLeft size={20}/></button>
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text" }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500 outline-none transition-all" />
  </div>
);

export default Aut; // Fixes missing default export error

