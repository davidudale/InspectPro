import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom"; // Added useParams
import { db } from "../../../Auth/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"; // Added doc, getDoc

import {
  Eye, ChevronLeft, Save, XCircle, Printer, Zap, ClipboardCheck, Activity, ShieldCheck, Camera,
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";
import InspectorNavbar from "../../InspectorsFile/InspectorNavbar";

// ... (INSPECTION_SCHEMAS remains exactly as you provided)

const VisualReport = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams(); // To handle direct database fetching if needed
  const [reportMode, setReportMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("logistics");

  const [reportData, setReportData] = useState({
    general: {
      platform: " ", equipment: "", tag: "", reportNum: "",
      date: new Date().toISOString().split("T")[0],
      client: "", testCode: "API 510", contractNum: "N/A", location: " ", inspect_by: "",
    },
    environmental: { lighting: "Natural", surface: "Cleaned", access: "Ground Level", temp: "Ambient" },
    observations: [],
    images: [],
  });

  // --- RESTRUCTURED TO FETCH ALL RELEVANT DETAILS ---
  useEffect(() => {
    const initializeManifest = async () => {
      // Scenario A: Data passed via Navigation State (from Report Manager or Inspector List)
      if (location.state?.preFill) {
        const p = location.state.preFill;
        const schema = INSPECTION_SCHEMAS[p.assetType] || INSPECTION_SCHEMAS["Default"];
        
        setReportData((prev) => ({
          ...prev,
          general: { 
            ...prev.general, 
            ...p,
            // Ensure names match your database keys (clientName/locationName)
            client: p.clientName || p.client || "",
            platform: p.locationName || p.location || "",
            tag: p.tag || p.equipmentTag || ""
          },
          observations: schema.map((item) => ({ ...item, photoRef: "" })),
        }));
      } 
      // Scenario B: Data needs to be fetched from 'projects' collection via ID
      else if (id) {
        try {
          const docRef = doc(db, "projects", id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const p = docSnap.data();
            const schema = INSPECTION_SCHEMAS[p.equipmentCategory] || INSPECTION_SCHEMAS["Default"];
            
            setReportData((prev) => ({
              ...prev,
              general: {
                ...prev.general,
                client: p.clientName,
                platform: p.locationName,
                tag: p.equipmentTag,
                reportNum: p.projectId,
              },
              observations: schema.map((item) => ({ ...item, photoRef: "" })),
            }));
          }
        } catch (error) {
          toast.error("Failed to sync with projects database");
        }
      }
    };

    initializeManifest();
  }, [location.state, id]);

  const handlePhotoUpload = async (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    const cloudName = "dsgzpl0xt";
    const uploadPreset = "inspectpro";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      toast.info(`Uploading evidence for ${reportData.observations[idx].sn}...`);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const d = await res.json();
      const newObs = [...reportData.observations];
      newObs[idx].photoRef = d.secure_url;
      setReportData({ ...reportData, observations: newObs });
      toast.success("Evidence linked to component");
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, "inspection_reports"), {
        ...reportData,
        technique: "Visual (VT)",
        inspector: user?.displayName || "Authorized Inspector",
        timestamp: serverTimestamp(),
      });
      toast.success("Technical Manifest Authorized");
      setReportMode(true);
    } catch (error) {
      toast.error("Sync Failure");
    } finally {
      setIsSaving(false);
    }
  };

  // --- SUB-COMPONENT: WEB REPORT VIEW (REMAINS AS PROVIDED) ---
  const WebView = () => {
    const totalPages = 4;
    const evidencePhotos = reportData.observations.filter((obs) => obs.photoRef);

    const PageHeader = () => (
      <div className="grid grid-cols-[1fr_2fr_1fr] border-2 border-slate-900 mb-6 text-center items-center font-bold">
        <div className="border-r-2 border-slate-900 p-2 h-16 flex items-center justify-center bg-slate-50 uppercase text-[9px] text-black">
          Client Portfolio
        </div>
        <div className="p-2 space-y-1 text-black">
          <div className="text-[10px] uppercase tracking-widest">{reportData.general.platform}</div>
          <div className="text-[11px] uppercase font-black">{reportData.general.equipment}: {reportData.general.tag}</div>
        </div>
        <div className="border-l-2 border-slate-900 p-2 text-[10px] text-blue-800 font-black uppercase tracking-widest">
          INSPECTPRO™
        </div>
      </div>
    );

    const PageFooter = ({ pageNum }) => (
      <div className="mt-auto border-t-2 border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase text-black">
        <div>Ref: <span className="font-normal">{reportData.general.tag}</span></div>
        <div>Page {pageNum} of {totalPages}</div>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-100 py-10 overflow-y-auto no-scrollbar font-sans text-black">
        <div className="fixed right-10 top-10 flex flex-col gap-4 no-print z-50">
          <button onClick={() => window.print()} className="bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><Printer size={24} /></button>
          <button onClick={() => setReportMode(false)} className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><XCircle size={24} /></button>
        </div>

        {/* ... (Your Page 1, 2, 3 remains exactly as per your provided code) ... */}

        {/* PAGE 4: PHOTOGRAPHIC APPENDIX (Restored) */}
        <div className="max-w-[850px] mx-auto bg-white border border-slate-300 p-12 shadow-2xl min-h-[1100px] flex flex-col print:m-0">
          <PageHeader />
          <h3 className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-8 tracking-widest text-left">3.0 Visual Evidence Appendix</h3>
          <div className="flex-1">
            {evidencePhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-8">
                {evidencePhotos.map((obs, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="border-2 border-slate-900 aspect-video bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm">
                      <img src={obs.photoRef} className="w-full h-full object-cover" alt="Technical Evidence" />
                    </div>
                    <p className="text-[9px] font-black text-center uppercase text-black leading-tight">Ref {obs.sn}: {obs.component.split("(")[0]}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 uppercase font-bold text-[10px] tracking-widest">No photographic evidence attached</div>
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
      { user === 'Admin' ? <AdminNavbar /> : <InspectorNavbar />} 
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            {/* ... (Your Header and Form remain exactly as per your provided code) ... */}
            {/* Component Mapping logic remains intact */}
          </div>
        </main>
      </div>
    </div>
  );
};

// ... (InputField component remains exactly as you provided)

export default VisualReport;