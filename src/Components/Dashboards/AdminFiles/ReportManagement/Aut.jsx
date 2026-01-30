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

  // --- COMPONENT: WEB VIEW (PRINTABLE REPORT) ---
  const WebView = () => {
    const PageHeader = () => (
      <div className="grid grid-cols-[1fr_2fr_1fr] border-2 border-slate-900 mb-6 text-center items-center font-bold">
        <div className="border-r-2 border-slate-900 p-2 h-16 flex items-center justify-center bg-slate-50">
           {reportData.general.clientLogo ? <img src={reportData.general.clientLogo} className="max-h-full object-contain" alt="Client"/> : "CLIENT"}
        </div>
        <div className="p-2 space-y-1">
          <div className="text-[10px] uppercase tracking-widest">{reportData.general.platform}</div>
          <div className="text-[11px] uppercase font-black">{reportData.general.equipment} ({reportData.general.tag})</div>
        </div>
        <div className="border-l-2 border-slate-900 p-2 text-[10px] text-blue-800 uppercase flex items-center justify-center font-black">
          INSPECTPRO™
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-100 py-10 no-scrollbar overflow-y-auto">
        <div className="fixed right-10 top-10 flex flex-col gap-4 no-print z-50">
          <button onClick={() => window.print()} className="bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><Printer size={24}/></button>
          <button onClick={() => setReportMode(false)} className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><XCircle size={24}/></button>
        </div>

        {/* PAGE 1: COVER */}
        <div className="max-w-[850px] mx-auto bg-white border-[1px] border-slate-300 p-[80px] shadow-2xl mb-10 min-h-[1100px] flex flex-col">
          <div className="flex justify-between items-center mb-20">
            <div className="h-20 w-40 bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[10px] uppercase text-slate-400">Client Logo</div>
            <div className="text-xl font-black text-blue-900 uppercase">Inspection Authority</div>
          </div>
          <div className="text-center flex-1">
            <h1 className="text-4xl font-serif font-bold underline mb-4">{reportData.general.platform}</h1>
            <h2 className="text-2xl font-bold mb-10 tracking-widest uppercase">Corrosion Mapping Report</h2>
            <div className="w-full aspect-video bg-slate-100 border border-slate-900 mx-auto mb-10 flex items-center justify-center overflow-hidden">
               {reportData.images[0] ? <img src={reportData.images[0].url} className="w-full h-full object-cover" alt="Primary Asset"/> : <Activity size={80} className="text-slate-200"/>}
            </div>
            <div className="space-y-4 text-left inline-block">
              <p className="text-sm font-bold uppercase">Report Ref: <span className="font-normal">{reportData.general.reportNum}</span></p>
              <p className="text-sm font-bold uppercase">Asset Tag: <span className="font-normal">{reportData.general.tag}</span></p>
              <p className="text-sm font-bold uppercase">Date: <span className="font-normal">{reportData.general.date}</span></p>
            </div>
          </div>
          <div className="mt-auto border-t-4 border-slate-900 pt-6 text-center">
            <p className="text-xs font-black text-red-600 tracking-[0.3em]">CONFIDENTIAL ENGINEERING DOCUMENT</p>
          </div>
        </div>

        {/* PAGE 2: VESSEL DATA */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl mb-10 min-h-[1100px]">
          <PageHeader />
          <h3 className="font-black text-sm uppercase underline mb-6 border-b-2 border-slate-900 pb-2">2.0 Vessel Specification Data</h3>
          <table className="w-full border-collapse border-2 border-slate-900 text-[11px]">
            <tbody>
              {Object.entries(reportData.vesselData).map(([key, value]) => (
                <tr key={key} className="border-b border-slate-900">
                  <td className="p-3 bg-slate-50 font-bold uppercase border-r-2 border-slate-900 w-1/3">{key.replace(/([A-Z])/g, ' $1')}</td>
                  <td className="p-3">{value || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg hover:text-orange-500 transition-all"><ChevronLeft size={20}/></button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2"><Zap className="text-orange-500" /> API 510 Workflow</h1>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setReportMode(true)} className="bg-slate-800 px-6 py-2 rounded-xl text-xs font-bold uppercase border border-slate-700 hover:bg-slate-700">Preview</button>
                <button onClick={handleSaveToFirebase} disabled={isSaving} className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-orange-700 transition-all">
                  <Save size={14} /> {isSaving ? "Syncing..." : "Commit Changes"}
                </button>
              </div>
            </header>
<div className="flex border-b border-slate-800 mb-8 gap-6 overflow-x-auto pb-2 scrollbar-hide">
              {[
                "general",
                "vesselData",
                "visual",
                "photos",
                "autMetrics",
                "schematics",
                "shearWave",
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab ? "text-orange-500 border-b-2 border-orange-500 pb-2" : "text-slate-500"}`}
                >
                  {tab === "vesselData"
                    ? "2. Vessel Data"
                    : tab === "visual"
                      ? "3. Visual Inspection"
                      : tab === "photos"
                        ? "4. Photographic Details"
                        : tab === "autMetrics"
                          ? "5. AUT Mapping"
                          : tab === "schematics"
                            ? "6. SCHEMATICS"
                            : tab === "shearWave"
                              ? "7. Shear Wave"
                              : tab.replace(/([A-Z])/g, " $1")}
                </button>
              ))}
            </div>

            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-md">
              {activeTab === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  <InputField
                    label="Client"
                    value={reportData.general.client}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        general: { ...reportData.general, client: v },
                      })
                    }
                  />
                  <InputField
                    label="Platform"
                    value={reportData.general.platform}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        general: { ...reportData.general, platform: v },
                      })
                    }
                  />
                  <InputField
                    label="Tag Number"
                    value={reportData.general.tag}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        general: { ...reportData.general, tag: v },
                      })
                    }
                  />
                  <InputField
                    label="Work Order #"
                    value={reportData.general.workOrder}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        general: { ...reportData.general, workOrder: v },
                      })
                    }
                  />
                </div>
              )}

              {activeTab === "vesselData" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  <InputField
                    label="Serial No."
                    value={reportData.vesselData.serialNo}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: { ...reportData.vesselData, serialNo: v },
                      })
                    }
                  />
                  <InputField
                    label="Design Pressure"
                    value={reportData.vesselData.designPressure}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: {
                          ...reportData.vesselData,
                          designPressure: v,
                        },
                      })
                    }
                  />
                  <InputField
                    label="Max Allowable Pressure"
                    value={reportData.vesselData.allowablePressure}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: {
                          ...reportData.vesselData,
                          allowablePressure: v,
                        },
                      })
                    }
                  />
                  <InputField
                    label="MDMT"
                    value={reportData.vesselData.mdmt}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: { ...reportData.vesselData, mdmt: v },
                      })
                    }
                  />
                  <InputField
                    label="Test Pressure"
                    value={reportData.vesselData.testPressure}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: {
                          ...reportData.vesselData,
                          testPressure: v,
                        },
                      })
                    }
                  />
                  <InputField
                    label="Shell Thk"
                    value={reportData.vesselData.shellThk}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: { ...reportData.vesselData, shellThk: v },
                      })
                    }
                  />
                  <InputField
                    label="Head Thickness"
                    value={reportData.vesselData.headThk}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: { ...reportData.vesselData, headThk: v },
                      })
                    }
                  />
                  <InputField
                    label="Vessel Dia (ID)"
                    value={reportData.vesselData.vesselDia}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: { ...reportData.vesselData, vesselDia: v },
                      })
                    }
                  />
                  <InputField
                    label="Year of Manufacture"
                    value={reportData.vesselData.manufactureYear}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: {
                          ...reportData.vesselData,
                          manufactureYear: v,
                        },
                      })
                    }
                  />
                  <InputField
                    label="P.O. No."
                    value={reportData.vesselData.poNo}
                    onChange={(v) =>
                      setReportData({
                        ...reportData,
                        vesselData: { ...reportData.vesselData, poNo: v },
                      })
                    }
                  />
                </div>
              )}
              {activeTab === "visual" && (
  <div className="space-y-8 animate-in fade-in duration-300">
    <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-4">
      3. External Visual Inspection
    </h2>

    {/* Section 3.1 Table */}
    <div className="overflow-x-auto">
      <h3 className="text-[10px] text-slate-500 font-bold mb-4 uppercase">3.1 External Surface of The Vessel</h3>
      <table className="w-full text-left text-[11px] border-separate border-spacing-y-2">
        <thead>
          <tr className="text-slate-500 uppercase font-bold tracking-widest">
            <th className="px-4">S/N</th>
            <th className="px-4 w-1/3">Component</th>
            <th className="px-4">Observations</th>
            <th className="px-4">Upload Evidence</th>
          </tr>
        </thead>
        <tbody>
          {reportData.visualObservations.map((item, idx) => (
            <tr key={item.sn} className="bg-slate-900/50 border border-slate-800 rounded-xl">
              <td className="p-4 font-mono text-slate-500">{item.sn}</td>
              <td className="p-4 font-bold text-white text-[10px] uppercase">{item.component}</td>
              <td className="p-4">
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none focus:border-orange-500"
                  rows="1"
                  value={item.observation}
                  onChange={(e) => {
                    const newList = [...reportData.visualObservations];
                    newList[idx].observation = e.target.value;
                    setReportData({ ...reportData, visualObservations: newList });
                  }}
                />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {/* Photo Preview Thumbnail */}
                  {item.photoRef ? (
                    <div className="relative w-10 h-10 rounded border border-orange-500/50 overflow-hidden bg-slate-950">
                      <img src={item.photoRef} className="w-full h-full object-cover" alt="ref" />
                      <button 
                        onClick={() => {
                          const newList = [...reportData.visualObservations];
                          newList[idx].photoRef = "";
                          setReportData({ ...reportData, visualObservations: newList });
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-[8px] text-red-400 font-bold"
                      >
                        DEL
                      </button>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-700">
                      <Camera size={14} />
                    </div>
                  )}

                  {/* Upload Button */}
                  <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 border border-slate-700">
                    <Plus size={12} /> {item.photoRef ? "Change" : "Upload"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const cloudName = "dsgzpl0xt";
                        const uploadPreset = "inspectpro";
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("upload_preset", uploadPreset);
                        
                        try {
                          toast.info(`Uploading ${item.sn}...`);
                          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                            method: "POST",
                            body: formData,
                          });
                          const d = await res.json();
                          const newList = [...reportData.visualObservations];
                          newList[idx].photoRef = d.secure_url;
                          setReportData({ ...reportData, visualObservations: newList });
                          toast.success("Linked Successfully");
                        } catch (err) {
                          toast.error("Upload Error");
                        }
                      }}
                    />
                  </label>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
                  {/* Section 3.2: Auxiliary Components */}
<div className="mt-12">
  <h3 className="text-[10px] text-slate-500 font-bold mb-4 uppercase">3.2 Auxiliary Components Associated with Vessel</h3>
  <table className="w-full text-left text-[11px] border-separate border-spacing-y-2">
    <thead>
      <tr className="text-slate-500 uppercase font-bold tracking-widest">
        <th className="px-4 w-1/3">Component</th>
        <th className="px-4">Observations</th>
        <th className="px-4">Upload Evidence</th>
      </tr>
    </thead>
    <tbody>
      {reportData.auxiliaryObservations.map((item, idx) => (
        <tr key={item.sn} className="bg-slate-900/50 border border-slate-800 rounded-xl">
          <td className="p-4 font-bold text-white text-[10px] uppercase">{item.component}</td>
          <td className="p-4">
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none focus:border-orange-500"
              rows="1"
              value={item.observation}
              onChange={(e) => {
                const newList = [...reportData.auxiliaryObservations];
                newList[idx].observation = e.target.value;
                setReportData({ ...reportData, auxiliaryObservations: newList });
              }}
            />
          </td>
          <td className="p-4">
            <div className="flex items-center gap-3">
              {item.photoRef ? (
                <div className="relative w-10 h-10 rounded border border-orange-500/50 overflow-hidden bg-slate-950">
                  <img src={item.photoRef} className="w-full h-full object-cover" alt="ref" />
                  <button 
                    onClick={() => {
                      const newList = [...reportData.auxiliaryObservations];
                      newList[idx].photoRef = "";
                      setReportData({ ...reportData, auxiliaryObservations: newList });
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-[8px] text-red-400 font-bold"
                  >
                    DEL
                  </button>
                </div>
              ) : (
                <div className="w-10 h-10 rounded border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-700">
                  <Camera size={14} />
                </div>
              )}
              <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 border border-slate-700">
                <Plus size={12} /> {item.photoRef ? "Change" : "Upload"}
                <input
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("upload_preset", "inspectpro");
                    try {
                      toast.info(`Uploading ${item.sn}...`);
                      const res = await fetch(`https://api.cloudinary.com/v1_1/dsgzpl0xt/image/upload`, { method: "POST", body: formData });
                      const d = await res.json();
                      const newList = [...reportData.auxiliaryObservations];
                      newList[idx].photoRef = d.secure_url;
                      setReportData({ ...reportData, auxiliaryObservations: newList });
                      toast.success("Evidence Linked");
                    } catch (err) { toast.error("Upload Error"); }
                  }}
                />
              </label>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

{/* Section 3.3: Instrumentation */}
<div className="mt-12">
  <h3 className="text-[10px] text-slate-500 font-bold mb-4 uppercase">3.3 Instrumentation and Associated Hardware</h3>
  <table className="w-full text-left text-[11px] border-separate border-spacing-y-2">
    <tbody>
      {reportData.instrumentationObservations.map((item, idx) => (
        <tr key={item.sn} className="bg-slate-900/50 border border-slate-800 rounded-xl">
          <td className="p-4 font-bold text-white text-[10px] uppercase w-1/3">{item.component}</td>
          <td className="p-4">
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none focus:border-orange-500"
              rows="1"
              value={item.observation}
              onChange={(e) => {
                const newList = [...reportData.instrumentationObservations];
                newList[idx].observation = e.target.value;
                setReportData({ ...reportData, instrumentationObservations: newList });
              }}
            />
          </td>
          <td className="p-4">
            <div className="flex items-center gap-3">
              {item.photoRef ? (
                <div className="relative w-10 h-10 rounded border border-orange-500/50 overflow-hidden bg-slate-950">
                  <img src={item.photoRef} className="w-full h-full object-cover" alt="ref" />
                  <button 
                    onClick={() => {
                      const newList = [...reportData.instrumentationObservations];
                      newList[idx].photoRef = "";
                      setReportData({ ...reportData, instrumentationObservations: newList });
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-[8px] text-red-400 font-bold"
                  >
                    DEL
                  </button>
                </div>
              ) : (
                <div className="w-10 h-10 rounded border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-700">
                  <Camera size={14} />
                </div>
              )}
              <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 border border-slate-700">
                <Plus size={12} /> {item.photoRef ? "Change" : "Upload"}
                <input
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("upload_preset", "inspectpro");
                    try {
                      toast.info(`Uploading ${item.sn}...`);
                      const res = await fetch(`https://api.cloudinary.com/v1_1/dsgzpl0xt/image/upload`, { method: "POST", body: formData });
                      const d = await res.json();
                      const newList = [...reportData.instrumentationObservations];
                      newList[idx].photoRef = d.secure_url;
                      setReportData({ ...reportData, instrumentationObservations: newList });
                      toast.success("Evidence Linked");
                    } catch (err) { toast.error("Upload Error"); }
                  }}
                />
              </label>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
                </div>
              )}
              {activeTab === "photos" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
                    <div>
                      <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                        4. Photographic Details [cite: 67]
                      </h2>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase">
                        As many photos as possible should be added and well
                        labelled
                      </p>
                    </div>
                    <label className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-900/20 active:scale-95">
                      <Camera size={16} />
                      <span>Attach Evidence</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>

                  {reportData.images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {reportData.images.map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative bg-slate-900/40 border border-slate-800 rounded-[2rem] p-5 transition-all hover:border-orange-500/30 backdrop-blur-sm"
                        >
                          {/* Photo Preview Container */}
                          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                            <img
                              src={img.url}
                              alt={`Inspection Evidence ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Badge for Photo Index */}
                            <div className="absolute top-4 left-4 px-3 py-1 bg-orange-600 text-[10px] font-bold text-white rounded-lg uppercase tracking-tight shadow-lg">
                              Evidence Item {idx + 1}
                            </div>
                          </div>

                          {/* Label Input Section */}
                          <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Description / Label
                              </label>
                              <button
                                onClick={() => {
                                  const filtered = reportData.images.filter(
                                    (_, i) => i !== idx,
                                  );
                                  setReportData({
                                    ...reportData,
                                    images: filtered,
                                  });
                                }}
                                className="text-[9px] text-red-500 font-bold uppercase hover:text-red-400 transition-colors"
                              >
                                Remove Photo
                              </button>
                            </div>
                            <textarea
                              placeholder="Enter detailed label for this photo..."
                              value={img.caption}
                              onChange={(e) => {
                                const newImages = [...reportData.images];
                                newImages[idx].caption = e.target.value;
                                setReportData({
                                  ...reportData,
                                  images: newImages,
                                });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-orange-500 transition-colors min-h-[80px] resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/20">
                      <div className="p-4 bg-slate-900 rounded-full mb-4 text-slate-700">
                        <Camera size={40} />
                      </div>
                      <p className="text-slate-500 text-sm font-medium">
                        No photos attached yet.
                      </p>
                      <p className="text-slate-600 text-[10px] uppercase tracking-widest mt-1">
                        Upload JPG or PNG files for Section 4{" "}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "autMetrics" && (
  <div className="space-y-8 animate-in fade-in duration-300">
    <div>
      <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-4">
        5.1 AUT Technique & Introduction
      </h2>
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          Equipment Description & Methodology
        </label>
        <textarea 
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white outline-none focus:border-orange-500 min-h-[150px]"
          placeholder="e.g., Olympus Hydroform with Gekko PAUT system..."
          value={reportData.autTechnique.introduction}
          onChange={(e) => setReportData({
            ...reportData, 
            autTechnique: {...reportData.autTechnique, introduction: e.target.value}
          })}
        />
      </div>
    </div>
    
    {/* Existing AUT Metrics Table (Step 1 code) follows here... */}
  </div>
)}
{activeTab === "schematics" && (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Header Section */}
    <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
      <div>
        <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest">
          6. Equipment Schematics
        </h2>
        <p className="text-[10px] text-slate-500 mt-1 uppercase">
          Draw or upload the technical schematics of the equipment inspected
        </p>
      </div>
      <label className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95">
        <Plus size={16} /> 
        <span>Add Drawing</span>
        <input 
          type="file" 
          multiple 
          className="hidden" 
          onChange={async (e) => {
            const files = Array.from(e.target.files);
            const cloudName = "dsgzpl0xt"; 
            const uploadPreset = "inspectpro"; 
            toast.info("Uploading Technical Drawing...");
            
            const uploadPromises = files.map(async (file) => {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("upload_preset", uploadPreset);
              const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
              const d = await res.json();
              return d.secure_url;
            });
            
            const urls = await Promise.all(uploadPromises);
            setReportData(prev => ({
              ...prev,
              schematics: [...prev.schematics, ...urls.map(url => ({ url, description: "" }))]
            }));
            toast.success("Drawing Added to Section 6");
          }} 
        />
      </label>
    </div>

    {/* Schematics List */}
    <div className="grid grid-cols-1 gap-8">
      {reportData.schematics.length > 0 ? (
        reportData.schematics.map((item, idx) => (
          <div key={idx} className="group bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 transition-all hover:border-orange-500/30">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Drawing Preview Container */}
              <div className="lg:w-1/2 relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                <img 
                  src={item.url} 
                  className="w-full h-full object-contain p-4" 
                  alt={`Schematic drawing ${idx + 1}`} 
                />
                <div className="absolute top-4 left-4 px-3 py-1 bg-slate-900/80 backdrop-blur-md text-[9px] font-bold text-orange-500 rounded-lg border border-orange-500/20 uppercase tracking-tighter">
                  Drawing Ref: 6.{idx + 1}
                </div>
              </div>

              {/* Labeling Section */}
              <div className="flex-1 flex flex-col justify-between py-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Drawing Description / Orientation
                    </label>
                    <button 
                      onClick={() => setReportData({
                        ...reportData, 
                        schematics: reportData.schematics.filter((_, i) => i !== idx)
                      })}
                      className="text-[9px] text-red-500 font-bold uppercase hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                  <textarea 
                    placeholder="Describe the area shown (e.g., North Elevation, Nozzle N1 Detail)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white outline-none focus:border-orange-500 transition-colors min-h-[120px] resize-none"
                    value={item.description}
                    onChange={(e) => {
                      const newSchematics = [...reportData.schematics];
                      newSchematics[idx].description = e.target.value;
                      setReportData({ ...reportData, schematics: newSchematics });
                    }}
                  />
                </div>
                <p className="text-[9px] text-slate-600 italic">
                  Note: Ensure the drawing clearly displays coordinate axes for corrosion mapping reference.
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/20">
          <div className="p-5 bg-slate-900 rounded-full mb-4 text-slate-700">
            <Activity size={40} />
          </div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-tight">No schematics uploaded</p>
          <p className="text-slate-600 text-[10px] uppercase tracking-widest mt-2">Required for Section 6 drawing record</p>
        </div>
      )}
    </div>
  </div>
)}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Aut;