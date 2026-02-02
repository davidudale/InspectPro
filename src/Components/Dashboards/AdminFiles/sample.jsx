import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  Eye,
  ChevronLeft,
  Save,
  XCircle,
  Printer,
  Zap,
  ClipboardCheck,
  Activity,
  ShieldCheck,
  Camera
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

// --- TECHNICAL SCHEMAS MAPPED TO YOUR DATA ---
const INSPECTION_SCHEMAS = {
  "Pressure Vessel (V)": [
    { sn: "3.1.1", component: "Shell and Transition Cone (external surface, weld seams, deformation, coating condition)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.2", component: "Lower Head (corrosion, distortion, drains, welds and coating condition)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.3", component: "Upper Head (corrosion, nozzles interface, vents, welds and coating condition)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.4", component: "Process Nozzles, Manways and Reinforcement Pads (leakage signs, cracks, gasket seating and weld condition)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.5", component: "Flanges, Stud Bolts and Gaskets (bolt condition, alignment, leakage, corrosion and insulation damage)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.6", component: "Small Bore Connections and Branch Pipes (vibration damage, cracking, supports and leakage)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.7", component: "Platforms, Ladders, Handrails and Attachments (structural integrity, corrosion and fastening)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.8", component: "Lifting Lugs, Trunnions and Temporary Rigging Points (cracks, deformation and certification markings)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.9", component: "Support Skirt, Saddles or Legs (corrosion at interface, drainage, cracks and settlement indicators)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.10", component: "Anchor Bolts, Base Plates and Grouting (corrosion, looseness, missing nuts and grout cracking)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.11", component: "Thermal Insulation System and Cladding (damaged areas, moisture ingress, CUI risk and sealing)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.12", component: "General External Condition corrosion, dents, bulging, mechanical impact damage and hot spots", condition: "Satisfactory", notes: "" },
    { sn: "3.1.13", component: "Nameplate, Design Data Plate and Tag Markings (legibility, correctness and attachment)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.14", component: "Earthing / Bonding Connections to Vessel (continuity, corrosion and secure fastening)", condition: "Satisfactory", notes: "" },
    { sn: "3.1.15", component: "Safety Relief Valves and Associated Piping (visual condition, supports, leakage and discharge routing)", condition: "Satisfactory", notes: "" },
  ],
  "Atmospheric Storage Tank (T)": [
    { sn: "3.2.1", component: "Tank Shell Plates", condition: "Satisfactory", notes: "" },
    { sn: "3.2.2", component: "Tank Bottom and Annular Ring", condition: "Satisfactory", notes: "" },
    { sn: "3.2.3", component: "Tank Roof Plates", condition: "Satisfactory", notes: "" },
    { sn: "3.2.4", component: "Floating Roof / Pontoon (if applicable)", condition: "Satisfactory", notes: "" },
    { sn: "3.2.5", component: "Roof Seals and Drain System", condition: "Satisfactory", notes: "" },
    { sn: "3.2.6", component: "Nozzles and Manways", condition: "Satisfactory", notes: "" },
    { sn: "3.2.7", component: "Shell to Bottom Welds", condition: "Satisfactory", notes: "" },
    { sn: "3.2.8", component: "Stairs, Walkways and Handrails", condition: "Satisfactory", notes: "" },
    { sn: "3.2.9", component: "Tank Foundation and Settlement", condition: "Satisfactory", notes: "" },
    { sn: "3.2.10", component: "External Corrosion and Coating Condition", condition: "Satisfactory", notes: "" },
  ],
  "Piping System (P)": [
    { sn: "3.3.1", component: "Pipe Runs and Routing", condition: "Satisfactory", notes: "" },
    { sn: "3.3.2", component: "Pipe Supports, Shoes and Guides", condition: "Satisfactory", notes: "" },
    { sn: "3.3.3", component: "Flanges and Bolting", condition: "Satisfactory", notes: "" },
    { sn: "3.3.4", component: "Expansion Joints / Bellows", condition: "Satisfactory", notes: "" },
    { sn: "3.3.5", component: "Valves and Actuators", condition: "Satisfactory", notes: "" },
    { sn: "3.3.6", component: "Small Bore Branch Connections", condition: "Satisfactory", notes: "" },
    { sn: "3.3.7", component: "Pipe Racks and Structural Steel", condition: "Satisfactory", notes: "" },
    { sn: "3.3.8", component: "Insulation and Weather Protection", condition: "Satisfactory", notes: "" },
    { sn: "3.3.9", component: "Leakage, Corrosion and Vibration", condition: "Satisfactory", notes: "" },
  ],
  Default: [
    { sn: "3.0.1", component: "General Body Condition", condition: "Satisfactory", notes: "" },
    { sn: "3.0.2", component: "Support Structure Integrity", condition: "Satisfactory", notes: "" },
  ],
};

const VisualReport = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [reportMode, setReportMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("logistics");

  const [reportData, setReportData] = useState({
    general: {
      platform: "", equipment: "", tag: "", reportNum: "", date: "2026-01-30",
      client: "", assetType: "", service: "", status: "", testCode: "API 510"
    },
    environmental: { lighting: "Natural", surface: "Cleaned", access: "Ground Level", temp: "Ambient" },
    observations: [],
    images: [],
  });

  useEffect(() => {
    if (location.state?.preFill) {
      const p = location.state.preFill;
      const schema = INSPECTION_SCHEMAS[p.assetType] || INSPECTION_SCHEMAS["Default"];
      setReportData((prev) => ({
        ...prev,
        general: { ...prev.general, ...p },
        observations: schema,
      }));
    }
  }, [location.state]);

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, "inspection_reports"), {
        ...reportData,
        technique: "Visual (VT)",
        inspector: user?.displayName,
        timestamp: serverTimestamp(),
      });
      toast.success("Technical Manifest Authorized");
      setReportMode(true);
    } catch (error) {
      toast.error("Sync Failure");
    } finally { setIsSaving(false); }
  };

  const WebView = () => {
    const PageHeader = () => (
      <div className="grid grid-cols-[1fr_2fr_1fr] border-2 border-slate-900 mb-6 text-center items-center font-bold">
        <div className="border-r-2 border-slate-900 p-2 h-16 flex items-center justify-center bg-slate-50 uppercase text-[9px] text-black">Client Portfolio</div>
        <div className="p-2 space-y-1 text-black">
          <div className="text-[10px] uppercase tracking-widest">{reportData.general.platform}</div>
          <div className="text-[11px] uppercase font-black">{reportData.general.equipment}: {reportData.general.tag}</div>
        </div>
        <div className="border-l-2 border-slate-900 p-2 text-[10px] text-blue-800 font-black uppercase">INSPECTPRO™</div>
      </div>
    );

    const PageFooter = ({ pageNum }) => (
      <div className="mt-auto border-t-2 border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase text-black">
        <div>Ref: {reportData.general.reportNum}</div>
        <div>Page {pageNum} of 4</div>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-100 py-10 overflow-y-auto no-scrollbar font-sans text-black">
        <div className="fixed right-10 top-10 flex flex-col gap-4 no-print z-50">
          <button onClick={() => window.print()} className="bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><Printer size={24} /></button>
          <button onClick={() => setReportMode(false)} className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><XCircle size={24} /></button>
        </div>

        [cite_start]{/* PAGE 1: COVER [cite: 1, 3, 6] */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-20 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page" style={{ breakAfter: "page" }}>
           <div className="flex justify-between items-center mb-20 uppercase font-black text-xl italic text-slate-900">VISUAL INSPECTION RECORD<div className="text-blue-900">INSPECTPRO</div></div>
           <div className="text-center flex-1">
              <h1 className="text-4xl font-serif font-bold underline mb-4 uppercase">{reportData.general.platform}</h1>
              <h2 className="text-2xl font-bold mb-10 uppercase tracking-widest text-slate-700">Visual Testing (VT) Report</h2>
              <div className="w-full aspect-video bg-slate-100 border-2 border-slate-900 mx-auto mb-10 flex items-center justify-center overflow-hidden shadow-inner">
                 {reportData.images[0] ? <img src={reportData.images[0].url} className="w-full h-full object-cover" alt="Asset"/> : <Activity size={80} className="text-slate-200" />}
              </div>
              <div className="space-y-4 text-left inline-block font-bold uppercase text-slate-800">
                <p className="text-sm">Report ID: <span className="font-normal">{reportData.general.reportNum}</span></p>
                <p className="text-sm">Asset Ref: <span className="font-normal">{reportData.general.tag}</span></p>
                <p className="text-sm">Date: <span className="font-normal">{reportData.general.date}</span></p>
              </div>
           </div>
           <div className="mt-auto border-t-4 border-slate-900 pt-6 text-center text-[10px] font-black text-red-600 tracking-[0.2em]">CONFIDENTIAL ENGINEERING DOCUMENT</div>
        </div>

        [cite_start]{/* PAGE 2: LOGISTICS [cite: 9, 14, 15, 18, 19] */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page" style={{ breakAfter: "page" }}>
          <PageHeader />
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-6 tracking-widest">1.0 Inspection Logistics & Setup</h3>
          <div className="grid grid-cols-2 gap-px bg-slate-900 border-2 border-slate-900 text-[11px] mb-10">
            <div className="bg-slate-50 p-3 font-bold uppercase">Lighting Method</div><div className="bg-white p-3">{reportData.environmental.lighting}</div>
            <div className="bg-slate-50 p-3 font-bold uppercase">Surface Preparation</div><div className="bg-white p-3">{reportData.environmental.surface}</div>
            <div className="bg-slate-50 p-3 font-bold uppercase">Access Method</div><div className="bg-white p-3">{reportData.environmental.access}</div>
            <div className="bg-slate-50 p-3 font-bold uppercase">Equipment Temp</div><div className="bg-white p-3">{reportData.environmental.temp} °C</div>
          </div>
          <PageFooter pageNum={2} />
        </div>

        [cite_start]{/* PAGE 3: TECHNICAL FINDINGS [cite: 23, 24, 28, 29] */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl mb-10 min-h-[1100px] flex flex-col print:m-0 break-after-page" style={{ breakAfter: "page" }}>
          <PageHeader />
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-4 tracking-widest">2.0 Assessment Summary</h3>
          <table className="w-full border-collapse border-2 border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100 uppercase font-black border-b-2 border-slate-900 text-black">
                <th className="border-r-2 border-slate-900 p-3 text-left w-16">S/N</th>
                <th className="border-r-2 border-slate-900 p-3 text-left w-1/3">Area</th>
                <th className="p-3 text-left w-1/4">Status</th>
                <th className="p-3 text-left">Observations</th>
              </tr>
            </thead>
            <tbody>
              {reportData.observations.map((obs) => (
                <tr key={obs.sn} className="border-b border-slate-900 text-black">
                  <td className="border-r-2 border-slate-900 p-3 font-mono text-[9px]">{obs.sn}</td>
                  <td className="border-r-2 border-slate-900 p-3 font-bold uppercase">{obs.component}</td>
                  <td className={`border-r-2 border-slate-900 p-3 font-bold uppercase ${obs.condition === 'Satisfactory' ? 'text-emerald-700' : 'text-red-600'}`}>{obs.condition}</td>
                  <td className="p-2 italic"><textarea readOnly rows={3} value={obs.notes || "Satisfactory at time of inspection."} className="w-full bg-transparent border-none text-[10px] resize-none outline-none overflow-hidden leading-tight" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PageFooter pageNum={3} />
        </div>

        {/* PAGE 4: PHOTOGRAPHIC EVIDENCE GRID */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl min-h-[1100px] flex flex-col print:m-0">
          <PageHeader />
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-6 tracking-widest">3.0 Vessel Photographic Details</h3>
          <div className="flex-1">
            {reportData.images && reportData.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-8">
                {reportData.images.map((img, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="border-2 border-slate-900 aspect-video bg-slate-50 flex items-center justify-center overflow-hidden shadow-md">
                      <img src={img.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] font-bold text-center uppercase border-b-2 border-slate-900 pb-2 text-black">{img.caption || `Photo ${idx + 1}: Observation Detail`}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                <Camera size={48} className="mb-2 opacity-20" /><p className="text-xs uppercase font-bold tracking-tighter">No Evidence Attached</p>
              </div>
            )}
          </div>
          <PageFooter pageNum={4} />
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
              <div className="flex items-center gap-4"><button onClick={() => navigate(-1)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-orange-500 hover:bg-orange-600 transition-all"><ChevronLeft size={20}/></button><h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2"><Eye className="text-orange-500" /> VT Manifest</h1></div>
              <div className="flex gap-3"><button onClick={() => setReportMode(true)} className="bg-slate-800 px-6 py-2 rounded-xl text-xs font-bold border border-slate-700">Preview</button><button onClick={handleSaveToFirebase} disabled={isSaving} className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg">{isSaving ? "Syncing..." : "Finalize Report"}</button></div>
            </header>

            <div className="flex gap-6 border-b border-slate-800 mb-8 overflow-x-auto">
              {["logistics", "findings"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab ? "text-orange-500 border-b-2 border-orange-500" : "text-slate-500"}`}>{tab}</button>
              ))}
            </div>

            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 min-h-[450px]">
              {activeTab === "logistics" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                  <InputField label="Asset Tag Number" value={reportData.general.tag} readOnly />
                  <InputField label="Asset Category" value={reportData.general.assetType} readOnly />
                  <InputField label="Report #" value={reportData.general.reportNum} onChange={(v) => setReportData({...reportData, general: {...reportData.general, reportNum: v}})} />
                  <InputField label="Shell Temp (°C)" value={reportData.environmental.temp} onChange={(v) => setReportData({...reportData, environmental: {...reportData.environmental, temp: v}})} />
                </div>
              )}

              {activeTab === "findings" && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                  <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest"><div className="col-span-4">Equipment Area</div><div className="col-span-3">Technical Condition</div><div className="col-span-5">Field Observations</div></div>
                  {reportData.observations.map((item, idx) => (
                    <div key={item.sn} className="grid grid-cols-12 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 items-center hover:border-orange-500/30 transition-colors">
                      <div className="col-span-4 text-xs font-bold uppercase text-white px-2 flex items-center gap-2"><ClipboardCheck size={14} className="text-slate-700"/> {item.component}</div>
                      <div className="col-span-3"><select className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] font-bold text-orange-500 outline-none" value={item.condition} onChange={(e) => { const newObs = [...reportData.observations]; newObs[idx].condition = e.target.value; setReportData({...reportData, observations: newObs}); }}><option>Satisfactory</option><option>Non-Conformity</option><option>Degraded</option></select></div>
                      <div className="col-span-5"><textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-400 outline-none focus:border-orange-500 resize-none" rows={1} placeholder="Findings..." value={item.notes} onChange={(e) => { const newObs = [...reportData.observations]; newObs[idx].notes = e.target.value; setReportData({...reportData, observations: newObs}); }} /></div>
                    </div>
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

// --- GLOBAL SHARED COMPONENTS ---
const InputField = ({ label, value, onChange, type = "text", readOnly = false }) => (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input type={type} value={value} readOnly={readOnly} onChange={(e) => onChange && onChange(e.target.value)} className={`bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none ${readOnly ? 'opacity-50 cursor-not-allowed border-slate-900' : 'focus:border-orange-500 shadow-inner'}`} />
    </div>
);

export default VisualReport;