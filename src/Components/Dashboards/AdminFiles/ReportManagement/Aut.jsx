import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import {
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
  doc,
  setDoc,
} from "firebase/firestore";
import { 
  ShieldCheck, Activity, Ruler, Camera, 
  ChevronLeft, CheckCircle2, XCircle, FileText, Printer, Save, Plus, Trash2
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import ManagerNavbar from "../../ManagerFile/ManagerNavbar";
import ManagerSidebar from "../../ManagerFile/ManagerSidebar";
import SupervisorNavbar from "../../SupervisorFiles/SupervisorNavbar";
import SupervisorSidebar from "../../SupervisorFiles/SupervisorSidebar";
import InspectorNavbar from "../../InspectorsFile/InspectorNavbar";
import InspectorSidebar from "../../InspectorsFile/InspectorSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

const Aut = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [reportMode, setReportMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectDocId, setProjectDocId] = useState("");

  const [reportData, setReportData] = useState({
    general: { 
      platform: "", equipment: "", tag: "", reportNum: "", date: "",
      client: "", contract: "", procedure: "", testCode: "API 510", criteria: "Client's Requirement",
      diagramImage: "",
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
    images: [],
    observations: [
      { id: Date.now(), title: "", description: "", photo: "" },
    ],
  });
  const isSupervisorRole =
    user?.role === "Supervisor" || user?.role === "Lead Inspector";
  const Navbar =
    user?.role === "Admin"
      ? AdminNavbar
      : user?.role === "Manager"
        ? ManagerNavbar
        : isSupervisorRole
          ? SupervisorNavbar
          : InspectorNavbar;
  const Sidebar =
    user?.role === "Admin"
      ? AdminSidebar
      : user?.role === "Manager"
        ? ManagerSidebar
        : isSupervisorRole
          ? SupervisorSidebar
          : InspectorSidebar;

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

      const projectQuery = query(
        collection(db, "projects"),
        where("projectId", "==", projectKey),
        limit(1),
      );
      const snapshot = await getDocs(projectQuery);

      if (!snapshot.empty) {
        const projectDoc = snapshot.docs[0];
        setProjectDocId(projectDoc.id);
        const projectData = projectDoc.data();
        if (projectData?.report) {
          setReportData(projectData.report);
          toast.info("Previous inspection details loaded for correction.");
        }
      } else if (projectKey) {
        setProjectDocId(projectKey);
      }
    };

    initializeManifest();
  }, [location.state]);

  // Fixed syntax error by properly closing preceding function
  const updateRow = (id, field, val, table) => {
    const updated = reportData[table].map(row => row.id === id ? { ...row, [field]: val } : row);
    setReportData({ ...reportData, [table]: updated });
  };

  const updateObservation = (id, field, value) => {
    setReportData((prev) => ({
      ...prev,
      observations: prev.observations.map((obs) =>
        obs.id === id ? { ...obs, [field]: value } : obs,
      ),
    }));
  };

  const addObservation = () => {
    setReportData((prev) => ({
      ...prev,
      observations: [
        ...prev.observations,
        { id: Date.now(), title: "", description: "", photo: "" },
      ],
    }));
  };

  const removeObservation = (id) => {
    setReportData((prev) => ({
      ...prev,
      observations: prev.observations.filter((obs) => obs.id !== id),
    }));
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

      const resolvedProjectId = projectDocId || reportData?.general?.projectId;
      if (!resolvedProjectId) {
        throw new Error("Project reference missing.");
      }
      await setDoc(
        doc(db, "projects", resolvedProjectId),
        {
          report: payload,
          status: payload.status || "Draft",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Inspection Data Saved to Firebase");
      setReportMode(true); 
    } catch (error) {
      toast.error("Error saving report: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (reportMode) {
    return <IntegrityStyleWebView reportData={reportData} setReportMode={setReportMode} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
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
              <Save size={14} /> {isSaving ? "Saving..." : user?.role === "Inspector" ? "Send for confirmation" : "ADD CHANGES"}
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
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="Client" value={reportData.general.client} onChange={(v) => setReportData({...reportData, general: {...reportData.general, client: v}})} />
                    <InputField label="Platform" value={reportData.general.platform} onChange={(v) => setReportData({...reportData, general: {...reportData.general, platform: v}})} />
                    <InputField label="Tag Number" value={reportData.general.tag} onChange={(v) => setReportData({...reportData, general: {...reportData.general, tag: v}})} />
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Upload SCHEMATIC DIAGRAM FOR ITEM IDENTIFICATION
                    </label>
                    <div className="mt-3 flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                        <Camera size={14} /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              setReportData((prev) => ({
                                ...prev,
                                general: { ...prev.general, diagramImage: reader.result },
                              }));
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {reportData.general.diagramImage && (
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                          Diagram attached
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                      Observations
                    </h3>
                    <div className="space-y-4">
                      {reportData.observations.map((obs, idx) => (
                        <div key={obs.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Observation {idx + 1}
                            </p>
                            {reportData.observations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeObservation(obs.id)}
                                className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <InputField
                            label="Title"
                            value={obs.title}
                            onChange={(v) => updateObservation(obs.id, "title", v)}
                          />
                          <TextArea
                            label="Description"
                            value={obs.description}
                            onChange={(v) => updateObservation(obs.id, "description", v)}
                          />
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors cursor-pointer">
                              <Camera size={14} /> Add observations from the form input side
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    updateObservation(obs.id, "photo", reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                            {obs.photo && (
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                                Photo attached
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addObservation}
                      className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-500 transition-colors"
                    >
                      Add Observation
                    </button>
                  </div>
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

const IntegrityStyleWebView = ({ reportData, setReportMode }) => {
  const observations = reportData.observations || [];
  const photoItems = observations.filter((obs) => obs.photo);
  const photosPerPage = 6;
  const photoPages = Math.max(1, Math.ceil(photoItems.length / photosPerPage));
  const totalPages = 4 + photoPages;
  const photoChunks = Array.from({ length: photoPages }, (_, idx) =>
    photoItems.slice(idx * photosPerPage, (idx + 1) * photosPerPage),
  );

  const Header = () => (
    <div className="relative flex items-center justify-between px-12 py-6 border-b border-slate-200/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30" />
        <div className="text-blue-900 font-black text-xl tracking-wide">
          INSPECTPRO
        </div>
      </div>
      {reportData.general.clientLogo ? (
        <img
          src={reportData.general.clientLogo}
          alt="Client"
          className="h-12 w-auto object-contain"
        />
      ) : (
        <div className="h-10 w-24 rounded-lg bg-slate-200/70" />
      )}
    </div>
  );

  const Footer = ({ page }) => (
    <div className="relative mt-auto px-12 pb-8">
      <div className="pt-6 border-t-2 border-slate-900/80 text-center">
        <p className="text-[10px] font-black text-red-600 tracking-[0.4em]">
          Original Document
        </p>
      </div>
      <div className="pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
        Page {page} of {totalPages}
      </div>
    </div>
  );

  const PageShell = ({ children }) => (
    <div className="report-page bg-white text-slate-950 p-0 print:p-0 min-h-[297mm] flex flex-col relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-blue-100/70 blur-2xl" />
        <div className="absolute top-24 -right-20 h-72 w-72 rounded-full bg-cyan-100/70 blur-2xl" />
        <div className="absolute bottom-16 left-1/3 h-64 w-64 rounded-full bg-indigo-100/60 blur-2xl" />
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 pb-20 print:p-0 print:bg-white">
      <style>{`
        @media print {
          .report-page {
            break-after: page;
            page-break-after: always;
          }
          .report-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => setReportMode(false)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 border border-slate-700"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={() => setReportMode(false)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-900/20"
          >
            <XCircle size={18} /> Close Preview
          </button>
        </div>
      </div>

      <div className="max-w-[210mm] w-full mx-auto space-y-0 px-2 sm:px-0">
        <PageShell>
          <Header />
          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-10">
            <div className="mb-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
              Technical Inspection Report
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-blue-700 tracking-tight drop-shadow-sm">
              AUT Inspection
            </h1>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-blue-600 tracking-tight">
              Report
            </h2>
            <div className="mt-8 h-1 w-40 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500" />
            <div className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
              {reportData?.general?.platform || "Facility Name"}
            </div>
          </div>
          <div className="relative px-12 pb-10 flex items-end justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <div>{reportData?.general?.client || "Client"}</div>
            <div>{reportData?.general?.reportNum || "Report No."}</div>
          </div>
        </PageShell>

        <PageShell>
          <Header />
          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">
              Section 00
            </h3>
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-orange-600" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                Overview
              </h2>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 overflow-hidden">
              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-slate-500">Client</div>
                  <div className="font-bold text-slate-800">{reportData?.general?.client || "N/A"}</div>
                </div>
                <div className="p-3 space-y-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-slate-500">Report Number</div>
                    <div className="font-bold">{reportData?.general?.reportNum || "N/A"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-slate-500">Contract Number</div>
                    <div className="font-bold">{reportData?.general?.contract || "N/A"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="font-bold uppercase text-slate-500">Date of Inspection</div>
                    <div className="font-bold">{reportData?.general?.date || "N/A"}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-slate-500">Location</div>
                  <div className="font-bold text-slate-800">{reportData?.general?.platform || "N/A"}</div>
                </div>
                <div className="p-3">
                  <div className="font-bold uppercase text-slate-500">Procedure</div>
                  <div className="font-bold">{reportData?.general?.procedure || "N/A"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 text-[10px]">
                <div className="border-r border-slate-200 p-3">
                  <div className="font-bold uppercase text-slate-500">Test Code</div>
                  <div className="text-red-600 font-black">{reportData?.general?.testCode || "N/A"}</div>
                </div>
                <div className="p-3">
                  <div className="font-bold uppercase text-slate-500">Acceptance Criteria</div>
                  <div className="font-bold">{reportData?.general?.criteria || "N/A"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">
                  Table of Contents
                </p>
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="border-r border-slate-200 p-2 w-12">S/N</th>
                    <th className="border-r border-slate-200 p-2">Description</th>
                    <th className="p-2 w-20">Page No.</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {[
                    { sn: "1.0", desc: "Overview", page: "2" },
                    { sn: "2.0", desc: "Schematic Diagram for Item Identification", page: "3" },
                    { sn: "3.0", desc: "Summary of Inspection Findings", page: "4" },
                    { sn: "4.0", desc: "Photographic Details", page: "5+" },
                  ].map((row, idx) => (
                    <tr
                      key={row.sn}
                      className={idx % 2 === 0 ? "bg-slate-50/70" : "bg-white"}
                    >
                      <td className="border-r border-slate-200 p-2 text-center font-bold">
                        {row.sn}
                      </td>
                      <td className="border-r border-slate-200 p-2 font-bold uppercase text-center">
                        {row.desc}
                      </td>
                      <td className="p-2 text-center font-bold">{row.page}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Footer page={2} />
        </PageShell>

        <PageShell>
          <Header />
          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="text-sm font-black uppercase tracking-wide text-slate-900">
              2.0 Diagram
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-xl shadow-blue-200/40 overflow-hidden p-6">
              {reportData?.general?.diagramImage ? (
                <img
                  src={reportData.general.diagramImage}
                  alt="Schematic Diagram for Item Identification"
                  className="w-full object-contain max-h-[520px] mx-auto"
                />
              ) : (
                <div className="h-[420px] border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] text-center px-6">
                  Upload SCHEMATIC DIAGRAM FOR ITEM IDENTIFICATION
                </div>
              )}
            </div>
          </div>
          <Footer page={3} />
        </PageShell>

        <PageShell>
          <Header />
          <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
            <div className="text-center space-y-2">
              <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                3.0 Summary of Inspection Findings
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                AUT Observations
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
              {observations.length ? (
                <ol className="space-y-5 text-[11px] leading-relaxed text-slate-700">
                  {observations.map((item, idx) => (
                    <li
                      key={item.id || idx}
                      className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-red-600 font-black">
                            {idx + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-red-600 uppercase">
                              {item.title || "Observation"}
                            </div>
                            <p className="mt-1 text-slate-700 break-words">
                              {item.description || "No observation details provided."}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-center min-h-[180px]">
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt={item.title || "Observation"}
                              className="max-h-[200px] w-auto object-contain"
                            />
                          ) : (
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] text-center">
                              No Image
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-xs text-slate-500 font-bold uppercase tracking-[0.3em] text-center">
                  No observations added
                </div>
              )}
            </div>
          </div>
          <Footer page={4} />
        </PageShell>

        {photoChunks.map((chunk, pageIdx) => {
          const pageNumber = 5 + pageIdx;
          return (
            <PageShell key={`photo-page-${pageIdx}`}>
              <Header />
              <div className="relative flex-1 flex flex-col px-12 pt-10 gap-8">
                <div className="text-center space-y-2">
                  <div className="text-sm font-black uppercase tracking-wide text-slate-900">
                    4.0 Photographic Details
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                    Evidence Gallery
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-200/40 p-6">
                  {chunk.length ? (
                    <div className="grid grid-cols-2 gap-4">
                      {chunk.map((o, idx) => (
                        <div key={o.id || idx} className="space-y-2">
                          <div className="border border-slate-200 rounded-2xl bg-white p-2 flex items-center justify-center">
                            <img
                              src={o.photo}
                              alt={o.title || `Evidence ${idx + 1}`}
                              className="h-[180px] w-auto object-contain"
                            />
                          </div>
                          <div className="text-[10px] text-slate-700 text-center font-semibold">
                            {o.title || `Evidence ${idx + 1}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[360px] border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em] text-center px-6">
                      No photographic evidence uploaded
                    </div>
                  )}
                </div>
              </div>
              <Footer page={pageNumber} />
            </PageShell>
          );
        })}
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

const TextArea = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500 outline-none transition-all resize-none"
    />
  </div>
);

export default Aut; // Fixes missing default export error

