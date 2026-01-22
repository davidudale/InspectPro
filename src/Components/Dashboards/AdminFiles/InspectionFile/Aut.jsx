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

  // Consolidated state mapped to the 16-page template [cite: 21, 47, 107, 173]
  const [reportData, setReportData] = useState({
    schematics: [], // Array of objects: { url: "", description: "" }
    images: [], // [cite: 70]
    general: {
      platform: "",
      equipment: "",
      tag: "",
      reportNum: "",
      date: "",
      client: "",
      workOrder: "",
    },
    autTechnique: {
      introduction: "Define the AUT equipment used for the inspection", // Placeholder from template
      equipmentModel: "",
      probeType: "",
      limitations: "",
    },
    vesselData: {
      serialNo: "",
      designPressure: "",
      testPressure: "",
      mdmt: "",
      allowablePressure: "",
      shellThk: "",
      headThk: "",
      size: "",
      manufactureYear: "",
      vesselDia: "",
      poNo: "",
    },
    visualObservations: [
      {
        sn: "3.1.1",
        component: "Shell And Transition Cone",
        observation: "",
        photoRef: "",
      },
      { sn: "3.1.2", component: "Lower Head", observation: "", photoRef: "" },
      { sn: "3.1.3", component: "Upper Head", observation: "", photoRef: "" },
      {
        sn: "3.1.4",
        component: "Nozzles And Man way",
        observation: "",
        photoRef: "",
      },
      {
        sn: "3.1.5",
        component: "Small Piping Connections",
        observation: "",
        photoRef: "",
      },
      {
        sn: "3.1.6",
        component: "Attachments Welds",
        observation: "",
        photoRef: "",
      },
      {
        sn: "3.1.7",
        component: "Lifting Lugs/Trunions",
        observation: "",
        photoRef: "",
      },
      {
        sn: "3.1.8",
        component: "Insulation Support",
        observation: "",
        photoRef: "",
      },
      {
        sn: "3.1.9",
        component: "Skirt/Support Legs",
        observation: "",
        photoRef: "",
      },
      {
        sn: "3.1.10",
        component: "Insulation/Weatherproofing",
        observation: "",
        photoRef: "",
      },
    ],
    auxiliaryObservations: [
      {
        sn: "3.2.1",
        component: "Platforms And Handrails",
        observation: "",
        photoRef: "",
      },
      {
        sn: "4.2.2",
        component: "Ladders / Stairways",
        observation: "",
        photoRef: "",
      },
      {
        sn: "3.2.3",
        component: "Pipe Supports",
        observation: "",
        photoRef: "",
      },
      { sn: "3.2.4", component: "Flanges", observation: "", photoRef: "" },
      { sn: "3.2.5", component: "Nameplate", observation: "", photoRef: "" },
      { sn: "3.2.6", component: "Foundation", observation: "", photoRef: "" },
      {
        sn: "3.2.7",
        component: "Foundation Bolts",
        observation: "",
        photoRef: "",
      },
      { sn: "3.2.8", component: "Fireproofing", observation: "", photoRef: "" },
      { sn: "3.2.9", component: "Guy Wires", observation: "", photoRef: "" },
      {
        sn: "3.2.10",
        component: "Safety Valve",
        observation: "",
        photoRef: "",
      },
    ],
    instrumentationObservations: [
      { sn: "3.3.1", component: "Level Gauges", observation: "", photoRef: "" },
      {
        sn: "3.3.2",
        component: "Pressure Gauges",
        observation: "",
        photoRef: "",
      },
      { sn: "3.3.3", component: "Thermowells", observation: "", photoRef: "" },
    ],
    autMetrics: [
      {
        id: Date.now(),
        axialX: "0",
        axialY: "0",
        nominal: "12.5",
        min: "12.5",
        location: "",
        remark: "",
      },
    ],
    mutNozzles: [
      {
        id: Date.now(),
        nozzleTag: "",
        dia: "",
        nominal: "",
        actual: "",
        minThk: "",
      },
    ],
    shearWave: [
      {
        id: Date.now(),
        nozzleNo: "",
        discontinuity: "",
        depth: "",
        result: "Accept",
      },
    ],
    summary: {
      visual: "",
      aut: "",
      nozzles: "",
      manway: "",
      circWeld: "",
      nozzleWeld: "",
      manwayWeld: "",
      conclusions: "",
      fitForService: "Yes",
    },
  });

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
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          },
        );
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
        general: {
          ...prev.general,
          tag: p.tag,
          equipment: p.equipment,
          platform: p.location,
          client: p.client,
          reportNum: p.reportNo,
          date: new Date().toISOString().split("T")[0],
        },
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

  if (reportMode)
    return (
      <WebView
        reportData={reportData}
        setReportMode={setReportMode}
        user={user}
        getStatus={getStatus}
      />
    );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-lg hover:text-orange-500"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                  <ShieldCheck className="text-orange-500" /> API 510 Inspection
                  Hub
                </h1>
              </div>
              <button
                onClick={handleSaveToFirebase}
                disabled={isSaving}
                className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 shadow-lg disabled:opacity-50"
              >
                <Save size={14} /> {isSaving ? "Saving..." : "Submit Report"}
              </button>
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

// --- TECHNICAL WEB REPORT VIEW ---
const WebView = ({ reportData, setReportMode, user, getStatus }) => {
  // Defensive logic for optional properties
  const summary = reportData?.summary || {};

  const PageHeader = () => (
    <div className="grid grid-cols-[1fr_2fr_1fr] border border-slate-900 mb-6 text-center items-center font-bold">
      <div className="border-r border-slate-900 p-2 text-[10px] uppercase">
        Client Logo
      </div>
      <div className="p-2 space-y-1">
        <div className="text-xs uppercase">
          {reportData?.general?.platform || "PLATFORM NAME"}
        </div>
        <div className="text-xs uppercase">
          {reportData?.general?.equipment} ({reportData?.general?.tag})
        </div>
      </div>
      <div className="border-l border-slate-900 p-2 text-[10px] text-blue-700 uppercase">
        Company Logo
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 p-12 font-serif selection:bg-orange-200">
      {/* PAGE 1: COVER PAGE */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative flex flex-col mb-12">
        <div className="text-center">
          <div className="flex justify-between items-start mb-20 text-lg font-bold uppercase">
            <div>Client Logo</div>
            <div>Company Logo</div>
          </div>
          <h1 className="text-2xl font-bold underline uppercase mb-8 tracking-widest">
            {reportData?.general?.platform}
          </h1>
          <h2 className="text-xl font-bold uppercase mb-4">
            CORROISON MAPPING INSPECTION REPORT
          </h2>
          <h3 className="text-lg font-bold uppercase mb-20">
            {reportData?.general?.equipment} & {reportData?.general?.tag}
          </h3>
          <div className="border border-slate-900 w-64 h-48 mx-auto flex items-center justify-center mb-24 bg-slate-50 text-[10px] font-bold uppercase">
            PHOTO OF EQUIPMENT
          </div>
          <div className="space-y-4 font-bold">
            <p className="text-red-600 text-sm">
              WORK ORDER #: {reportData?.general?.workOrder}
            </p>
            <p className="text-sm uppercase">
              REPORT#: {reportData?.general?.reportNum}
            </p>
            <p className="text-sm uppercase">
              DATE: {reportData?.general?.date}
            </p>
            <p className="text-sm uppercase tracking-[0.3em] mt-8 font-bold">
              ORIGINAL
            </p>
          </div>
        </div>
        <div className="mt-auto pt-10 text-center">
          <p className="text-red-600 text-sm font-bold underline uppercase tracking-widest">
            ({reportData?.general?.client || "CLIENT NAME"}) USE ONLY
          </p>
        </div>
      </div>

      {/* PAGE 2: INTRODUCTION */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12">
        <PageHeader />
        <table className="w-full text-[10px] border-collapse border border-slate-900 mb-8">
          <tbody>
            <tr>
              <td className="border border-slate-900 p-1 bg-slate-50 font-bold">
                Client:
              </td>
              <td className="border border-slate-900 p-1">
                {reportData?.general?.client}
              </td>
              <td className="border border-slate-900 p-1 bg-slate-50 font-bold">
                Report Number:
              </td>
              <td className="border border-slate-900 p-1">
                {reportData?.general?.reportNum}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-1 bg-slate-50 font-bold">
                Location:
              </td>
              <td className="border border-slate-900 p-1">
                {reportData?.general?.platform}
              </td>
              <td className="border border-slate-900 p-1 bg-slate-50 font-bold">
                Contract Number:
              </td>
              <td className="border border-slate-900 p-1">
                {reportData?.general?.contract}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-1 bg-slate-50 font-bold">
                Vessel:
              </td>
              <td className="border border-slate-900 p-1">
                {reportData?.general?.equipment}
              </td>
              <td className="border border-slate-900 p-1 bg-slate-50 font-bold">
                Date of Inspection:
              </td>
              <td className="border border-slate-900 p-1">
                {reportData?.general?.date}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mb-10 text-[11px] leading-relaxed">
          <h3 className="font-bold underline uppercase mb-2">INTRODUCTION:</h3>
          <p>
            At the request of{" "}
            <span className="text-red-600 font-bold">
              {reportData?.general?.client} Department
            </span>
            , Corrosion Mapping Inspection was carried out on{" "}
            <span className="text-red-600 font-bold">
              {reportData?.general?.equipment} ({reportData?.general?.tag})
            </span>{" "}
            at{" "}
            <span className="text-red-600 font-bold">
              {reportData?.general?.platform} platform
            </span>
            .
          </p>
        </div>
        <h3 className="font-bold text-sm mb-4">CONTENTS</h3>
        <table className="w-full text-xs border-collapse border border-slate-900">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-900 p-2 w-12">S/N</th>
              <th className="border border-slate-900 p-2">Description</th>
              <th className="border border-slate-900 p-2 w-20">Page No.</th>
            </tr>
          </thead>
          <tbody>
            {[
              { sn: "1", desc: "Executive Summary" },
              { sn: "2", desc: "Vessel General Data" },
              { sn: "3", desc: "External Visual Inspection" },
            ].map((item) => (
              <tr key={item.sn}>
                <td className="border border-slate-900 p-2 text-center">
                  {item.sn}
                </td>
                <td className="border border-slate-900 p-2">{item.desc}</td>
                <td className="border border-slate-900 p-2 text-center">
                  {parseInt(item.sn) + 2}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGE 3: EXECUTIVE SUMMARY */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12 flex flex-col">
        <PageHeader />
        <div className="flex-1">
          <h2 className="font-bold text-sm underline uppercase mb-6 tracking-tight">
            1. EXECUTIVE SUMMARY OF INSPECTION RESULTS
          </h2>
          <div className="mb-8">
            <h3 className="font-bold text-xs mb-2">1.1 Visual Inspection</h3>
            <div className="min-h-[60px] p-2 border border-slate-200 text-xs italic text-slate-500">
              {summary.visual || "Pending..."}
            </div>
          </div>
          <div className="mb-8">
            <h3 className="font-bold text-xs mb-2">1.2 AUT Inspection</h3>
            <p className="text-[10px] italic mb-2">
              Ref: Page 20 AUT Scan Thickness Data Overview
            </p>
            <div className="min-h-[60px] p-2 border border-slate-200 text-xs italic text-slate-500">
              {summary.aut || "Pending..."}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
          <div>Report Number: {reportData?.general?.reportNum}</div>
          <div>Page 3 of 16</div>
        </div>
      </div>

      {/* PAGE 4: VESSEL GENERAL DATA */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12 flex flex-col">
        <PageHeader />
        <h2 className="font-bold text-sm underline uppercase mb-4">
          2. VESSEL GENERAL DATA
        </h2>
        <table className="w-full text-[10px] border-collapse border border-slate-900 mb-4">
          <tbody>
            <tr>
              <td className="border border-slate-900 p-2 font-bold w-1/4">
                Vessel Tag No
              </td>
              <td className="border border-slate-900 p-2" colSpan="3">
                {reportData?.general?.tag}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-bold">
                Vessel Name
              </td>
              <td className="border border-slate-900 p-2" colSpan="3">
                {reportData?.general?.equipment}
              </td>
            </tr>
            <tr className="bg-slate-50">
              <td
                className="border border-slate-900 p-2 font-bold italic"
                colSpan="4"
              >
                Design Data: Obtained from nameplate
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-bold">
                Design Pressure
              </td>
              <td className="border border-slate-900 p-2">
                {reportData?.vesselData?.designPressure}
              </td>
              <td className="border border-slate-900 p-2 font-bold">
                Max Allowable Pressure
              </td>
              <td className="border border-slate-900 p-2">
                {reportData?.vesselData?.allowablePressure}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-bold">MDMT</td>
              <td className="border border-slate-900 p-2">
                {reportData?.vesselData?.mdmt}
              </td>
              <td className="border border-slate-900 p-2 font-bold">
                Test Pressure
              </td>
              <td className="border border-slate-900 p-2">
                {reportData?.vesselData?.testPressure}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-bold">
                Shell Thickness
              </td>
              <td className="border border-slate-900 p-2">
                {reportData?.vesselData?.shellThk}
              </td>
              <td className="border border-slate-900 p-2 font-bold">
                Head Thickness
              </td>
              <td className="border border-slate-900 p-2">
                {reportData?.vesselData?.headThk}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-bold">
                Vessel Dia (ID)
              </td>
              <td className="border border-slate-900 p-2">
                {reportData?.vesselData?.vesselDia}
              </td>
              <td className="border border-slate-900 p-2 font-bold">
                Serial No.
              </td>
              <td className="border border-slate-900 p-2">
                {reportData?.vesselData?.serialNo}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-bold">
                Year of manufacture
              </td>
              <td className="border border-slate-900 p-2" colSpan="3">
                {reportData?.vesselData?.manufactureYear}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-auto border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
          <div>Report Number: {reportData?.general?.reportNum}</div>
          <div>Page 4 of 16</div>
        </div>
      </div>
      {/* PAGE 5: EXTERNAL VISUAL INSPECTION */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12 flex flex-col">
        <PageHeader />

        <h2 className="font-bold text-sm underline uppercase mb-2">
          3. EXTERNAL VISUAL INSPECTION
        </h2>
        <h3 className="font-bold text-xs mb-4">
          3.1. External Surface of The Vessel
        </h3>

        <table className="w-full text-[10px] border-collapse border border-slate-900">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-900 p-2 w-12 text-center">
                S/N
              </th>
              <th className="border border-slate-900 p-2 w-1/3 text-left">
                Vessel Components
              </th>
              <th className="border border-slate-900 p-2 text-left">
                Observations
              </th>
              <th className="border border-slate-900 p-2 w-20 text-center">
                Photos
              </th>
            </tr>
          </thead>
          <tbody>
            {reportData?.visualObservations?.map((row) => (
              <tr key={row.sn}>
                <td className="border border-slate-900 p-2 text-center">
                  {row.sn}
                </td>
                <td className="border border-slate-900 p-2 font-bold">
                  {row.component}
                </td>
                <td className="border border-slate-900 p-2">
                  {row.observation || "No abnormalities observed."}
                </td>
                <td className="border border-slate-900 p-2 text-center">
                  {row.photoRef}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-auto border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
          <div>Report Number: {reportData?.general?.reportNum}</div>
          <div>Page 5 of 16</div>
        </div>
      </div>
      {/* PAGE 6: AUXILIARY & INSTRUMENTATION [cite: 61, 62, 65] */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12 flex flex-col">
        <PageHeader />

        <h3 className="font-bold text-xs mb-4">
          3.2. Auxiliary Components Associated with Vessel
        </h3>
        <table className="w-full text-[10px] border-collapse border border-slate-900 mb-8">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-900 p-2 w-12 text-center">
                S/N
              </th>
              <th className="border border-slate-900 p-2 w-1/3 text-left">
                Vessel Components
              </th>
              <th className="border border-slate-900 p-2 text-left">
                Observation
              </th>
              <th className="border border-slate-900 p-2 w-20 text-center">
                Photos
              </th>
            </tr>
          </thead>
          <tbody>
            {reportData?.auxiliaryObservations?.map((row) => (
              <tr key={row.sn}>
                <td className="border border-slate-900 p-2 text-center">
                  {row.sn}
                </td>
                <td className="border border-slate-900 p-2 font-bold">
                  {row.component}
                </td>
                <td className="border border-slate-900 p-2">
                  {row.observation || "Satisfactory"}
                </td>
                <td className="border border-slate-900 p-2 text-center">
                  {row.photoRef}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="font-bold text-xs mb-4">
          3.3. Instrumentation and Associated Hardware
        </h3>
        <table className="w-full text-[10px] border-collapse border border-slate-900">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-900 p-2 w-12 text-center">
                S/N
              </th>
              <th className="border border-slate-900 p-2 w-1/3 text-left">
                Vessel Components
              </th>
              <th className="border border-slate-900 p-2 text-left">
                Observation
              </th>
              <th className="border border-slate-900 p-2 w-20 text-center">
                Photos
              </th>
            </tr>
          </thead>
          <tbody>
            {reportData?.instrumentationObservations?.map((row) => (
              <tr key={row.sn}>
                <td className="border border-slate-900 p-2 text-center">
                  {row.sn}
                </td>
                <td className="border border-slate-900 p-2 font-bold">
                  {row.component}
                </td>
                <td className="border border-slate-900 p-2">
                  {row.observation || "Satisfactory"}
                </td>
                <td className="border border-slate-900 p-2 text-center">
                  {row.photoRef}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-auto border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
          <div>Report Number: {reportData?.general?.reportNum}</div>
          <div>Page 6 of 16</div>
        </div>
      </div>
      {/* PAGE 7: PHOTOGRAPHIC DETAILS [cite: 67, 70] */}
      <div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12 flex flex-col">
        <PageHeader />

        <h2 className="font-bold text-sm underline uppercase mb-4">
          4. PHOTOGRAPHIC DETAILS
        </h2>

        <div className="border border-slate-900 p-4 min-h-[800px]">
          <div className="grid grid-cols-2 gap-4">
            {reportData?.images?.map((img, idx) => (
              <div key={idx} className="space-y-2">
                <div className="border border-slate-300 aspect-video bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img
                    src={img.url}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[10px] text-center font-bold uppercase border-b border-slate-900 pb-1">
                  {img.caption || `Photo ${idx + 1}: Label Required`}
                </p>
              </div>
            ))}
          </div>

          {reportData?.images?.length === 0 && (
            <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">
              No photographic evidence attached to this report.
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
          <div>Report Number: {reportData?.general?.reportNum}</div>
          <div>Page 7 of 16 [cite: 73]</div>
        </div>
      </div>
      {/* PAGE 8: AUT TECHNIQUE INTRODUCTION */}
<div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12 flex flex-col">
  <PageHeader />
  
  <h2 className="font-bold text-sm underline uppercase mb-6">
    5. AUT CORROSION MAPPING INSPECTION
  </h2>
  
  <h3 className="font-bold text-xs mb-4">
    5.1. AUT Hydroform Technique - Introduction and Limitation
  </h3>
  
  <div className="text-xs leading-relaxed whitespace-pre-wrap border border-slate-200 p-6 min-h-[400px]">
    {reportData?.autTechnique?.introduction || "No technique description provided."}
  </div>

  <div className="mt-auto border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
    <div>Report Number: {reportData?.general?.reportNum}</div>
    <div>Page 8 of 16</div>
  </div>
</div>
{/* PAGE 9: EQUIPMENT SCHEMATICS */}
<div className="max-w-4xl mx-auto min-h-[1056px] border-2 border-slate-900 p-12 relative mb-12 flex flex-col">
  <PageHeader />
  
  <h2 className="font-bold text-sm underline uppercase mb-6 tracking-tight">
    6. Equipment Schematics
  </h2>
  
  <div className="border border-slate-900 p-8 flex-1 flex flex-col gap-8 min-h-[700px]">
    <p className="text-[10px] italic text-slate-500 mb-4 border-b border-slate-200 pb-2 uppercase font-bold">
      Draw the schematics of the equipment inspected
    </p>
    
    {reportData?.schematics?.map((item, idx) => (
      <div key={idx} className="space-y-4">
        <div className="w-full border border-slate-300 bg-slate-50 flex items-center justify-center p-2">
          <img src={item.url} alt={`Schematic Drawing ${idx + 1}`} className="max-h-[400px] object-contain" />
        </div>
        <p className="text-[11px] font-bold text-center underline uppercase">
          {item.description || `Drawing ${idx + 1}: Schematic Overview`}
        </p>
      </div>
    ))}

    {reportData?.schematics?.length === 0 && (
      <div className="flex-1 flex items-center justify-center text-slate-400 italic text-xs border-2 border-dashed border-slate-100 rounded-xl">
        No equipment schematics attached.
      </div>
    )}
  </div>

  <div className="mt-auto border-t border-slate-900 pt-2 flex justify-between text-[9px] font-bold uppercase">
    <div>Report Number: {reportData?.general?.reportNum}</div>
    <div>Page 9 of 16</div>
  </div>
</div>
      <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 no-print">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white p-3 rounded-full shadow-xl hover:bg-blue-700 transition-all"
        >
          <Printer size={20} />
        </button>
        <button
          onClick={() => setReportMode(false)}
          className="bg-slate-800 text-white p-3 rounded-full shadow-xl hover:bg-slate-700 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text" }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500 outline-none transition-all"
    />
  </div>
);

export default Aut; // Fixes missing default export error
