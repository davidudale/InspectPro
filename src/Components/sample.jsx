import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  ShieldCheck,
  Activity,
  Ruler,
  Camera,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  Save,
  Plus,
  Trash2,
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

  const [reportData, setReportData] = useState({
    images: [], // [cite: 70]
    general: { platform: "", equipment: "", tag: "", reportNum: "", date: "", client: "", workOrder: "" },
    vesselData: { serialNo: "", designPressure: "", testPressure: "", mdmt: "", allowablePressure: "", shellThk: "", headThk: "", size: "", manufactureYear: "", vesselDia: "", poNo: "" },
    visualObservations: [
      { sn: "3.1.1", component: "Shell And Transition Cone", observation: "", photoRef: "" },
      { sn: "3.1.2", component: "Lower Head", observation: "", photoRef: "" },
      { sn: "3.1.3", component: "Upper Head", observation: "", photoRef: "" },
      { sn: "3.1.4", component: "Nozzles And Man way", observation: "", photoRef: "" },
      { sn: "3.1.5", component: "Small Piping Connections", observation: "", photoRef: "" },
      { sn: "3.1.6", component: "Attachments Welds", observation: "", photoRef: "" },
      { sn: "3.1.7", component: "Lifting Lugs/Trunions", observation: "", photoRef: "" },
      { sn: "3.1.8", component: "Insulation Support", observation: "", photoRef: "" },
      { sn: "3.1.9", component: "Skirt/Support Legs", observation: "", photoRef: "" },
      { sn: "3.1.10", component: "Insulation/Weatherproofing", observation: "", photoRef: "" },
    ],
    auxiliaryObservations: [
      { sn: "3.2.1", component: "Platforms And Handrails", observation: "", photoRef: "" },
      { sn: "4.2.2", component: "Ladders / Stairways", observation: "", photoRef: "" },
      { sn: "3.2.3", component: "Pipe Supports", observation: "", photoRef: "" },
      { sn: "3.2.4", component: "Flanges", observation: "", photoRef: "" },
      { sn: "3.2.5", component: "Nameplate", observation: "", photoRef: "" },
      { sn: "3.2.6", component: "Foundation", observation: "", photoRef: "" },
      { sn: "3.2.7", component: "Foundation Bolts", observation: "", photoRef: "" },
      { sn: "3.2.8", component: "Fireproofing", observation: "", photoRef: "" },
      { sn: "3.2.9", component: "Guy Wires", observation: "", photoRef: "" },
      { sn: "3.2.10", component: "Safety Valve", observation: "", photoRef: "" },
    ],
    instrumentationObservations: [
      { sn: "3.3.1", component: "Level Gauges", observation: "", photoRef: "" },
      { sn: "3.3.2", component: "Pressure Gauges", observation: "", photoRef: "" },
      { sn: "3.3.3", component: "Thermowells", observation: "", photoRef: "" },
    ],
    autMetrics: [{ id: Date.now(), axialX: "0", axialY: "0", nominal: "12.5", min: "12.5", location: "", remark: "" }],
    mutNozzles: [{ id: Date.now(), nozzleTag: "", dia: "", nominal: "", actual: "", minThk: "" }],
    shearWave: [{ id: Date.now(), nozzleNo: "", discontinuity: "", depth: "", result: "Accept" }],
    summary: { visual: "", aut: "", nozzles: "", manway: "", circWeld: "", nozzleWeld: "", manwayWeld: "", conclusions: "", fitForService: "Yes" },
  });

  // --- MISSING PHOTO UPLOAD LOGIC  ---
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const cloudName = "dsgzpl0xt"; 
    const uploadPreset = "inspectpro"; 
    
    try {
      toast.info("Uploading Evidence...");
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        const d = await res.json();
        return d.secure_url;
      });

      const urls = await Promise.all(uploadPromises);
      setReportData((prev) => ({
        ...prev,
        images: [...prev.images, ...urls.map((url) => ({ url, caption: "" }))],
      }));
      toast.success("Photos Attached Successfully");
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    }
  };

  useEffect(() => {
    if (location.state?.preFill) {
      const p = location.state.preFill;
      setReportData((prev) => ({
        ...prev,
        general: { ...prev.general, tag: p.tag, equipment: p.equipment, platform: p.location, client: p.client, reportNum: p.reportNo, date: new Date().toISOString().split("T")[0] },
      }));
    }
  }, [location.state]);

  const getStatus = (nominal, min) => {
    const loss = nominal ? ((nominal - min) / nominal) * 100 : 0;
    return loss > 12.5 ? "REJECT" : "ACCEPT";
  };

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, "inspection_reports"), {
        ...reportData,
        inspector: user?.displayName || "Technical Lead",
        timestamp: serverTimestamp(),
      });
      toast.success("Inspection Saved");
      setReportMode(true);
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (reportMode) return <WebView reportData={reportData} setReportMode={setReportMode} user={user} getStatus={getStatus} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg hover:text-orange-500"><ChevronLeft size={20} /></button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2"><ShieldCheck className="text-orange-500" /> API 510 Inspection Hub</h1>
              </div>
              <button onClick={handleSaveToFirebase} disabled={isSaving} className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 shadow-lg disabled:opacity-50">
                <Save size={14} /> {isSaving ? "Saving..." : "Submit Report"}
              </button>
            </header>

            <div className="flex border-b border-slate-800 mb-8 gap-6 overflow-x-auto pb-2 scrollbar-hide">
              {["general", "vesselData", "visual", "photos", "autMetrics", "nozzleMut", "shearWave"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeTab === tab ? "text-orange-500 border-b-2 border-orange-500 pb-2" : "text-slate-500"}`}
                >
                  {tab === "vesselData" ? "2. Vessel Data" : tab === "visual" ? "3. Visual Inspection" : tab === "photos" ? "4. Photographic Details" : tab === "autMetrics" ? "5. AUT Mapping" : tab === "nozzleMut" ? "6. Nozzle MUT" : tab === "shearWave" ? "7. Shear Wave" : tab.replace(/([A-Z])/g, " $1")}
                </button>
              ))}
            </div>

            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800">
              {activeTab === "photos" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest">4. Photographic Details [cite: 67]</h2>
                    <label className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                      <Camera size={16} /> Upload Photos
                      <input type="file" multiple className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reportData.images.map((img, idx) => (
                      <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-4">
                        <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                          <img src={img.url} alt="Evidence" className="w-full h-full object-cover" />
                        </div>
                        <InputField label={`Photo ${idx + 1} Label`} value={img.caption} onChange={(v) => {
                          const newImages = [...reportData.images];
                          newImages[idx].caption = v;
                          setReportData({ ...reportData, images: newImages });
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Other tabs... */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- TECHNICAL WEB REPORT VIEW (Simplified for snippet) ---
const WebView = ({ reportData, setReportMode, user, getStatus }) => {
  const PageHeader = () => (
    <div className="grid grid-cols-[1fr_2fr_1fr] border border-slate-900 mb-6 text-center items-center font-bold">
      <div className="border-r border-slate-900 p-2 text-[10px] uppercase text-blue-800 font-bold tracking-tighter">InspectPro Hub</div>
      <div className="p-2 space-y-1">
        <div className="text-xs uppercase">{reportData?.general?.platform || "PLATFORM NAME"}</div>
        <div className="text-xs uppercase tracking-tight">{reportData?.general?.equipment} ({reportData?.general?.tag})</div>
      </div>
      <div className="border-l border-slate-900 p-2 text-[10px] text-blue-700 uppercase">NDE Division</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 p-12 font-serif">
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative flex flex-col mb-12">
        <PageHeader />
        <h2 className="font-bold text-sm underline uppercase mb-4">4. PHOTOGRAPHIC DETAILS [cite: 67]</h2>
        <div className="border border-slate-900 p-4 min-h-[800px]">
          <div className="grid grid-cols-2 gap-4">
            {reportData?.images?.map((img, idx) => (
              <div key={idx} className="space-y-2">
                <div className="border border-slate-300 aspect-video bg-slate-50 overflow-hidden">
                  <img src={img.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-contain" />
                </div>
                <p className="text-[10px] text-center font-bold uppercase border-b border-slate-900 pb-1">{img.caption || `Evidence Item ${idx + 1}`}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
          <div>Report No: {reportData?.general?.reportNum}</div><div>Page 7 of 16 [cite: 73]</div>
        </div>
      </div>
      <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 no-print">
        <button onClick={() => window.print()} className="bg-blue-600 text-white p-3 rounded-full shadow-xl"><Printer size={20}/></button>
        <button onClick={() => setReportMode(false)} className="bg-slate-800 text-white p-3 rounded-full shadow-xl"><ChevronLeft size={20}/></button>
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500 outline-none" />
  </div>
);

export default Aut;