import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../../Auth/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  ShieldCheck, Eye, Camera, ChevronLeft, CheckCircle2, 
  FileText, Save, Plus, Trash2, AlertTriangle, Thermometer
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";
import { useAuth } from "../../../Auth/AuthContext";

const VisualReport = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  const [reportData, setReportData] = useState({
    general: { platform: "", equipment: "", tag: "", reportNum: "", date: "", client: "" },
    conditions: { lighting: "Standard", access: "Scaffolding", surface: "Cleaned" },
    observations: [
      { id: 1, component: "Main Shell", condition: "Satisfactory", notes: "" },
      { id: 2, component: "Circumferential Welds", condition: "Satisfactory", notes: "" },
      { id: 3, component: "Nozzle Welds", condition: "Satisfactory", notes: "" },
      { id: 4, component: "Support Skirt", condition: "Satisfactory", notes: "" }
    ],
    images: []
  });

  // Pre-fill logic from the navigation state
  useEffect(() => {
    if (location.state?.preFill) {
      const p = location.state.preFill;
      setReportData(prev => ({
        ...prev,
        general: { ...prev.general, ...p, date: new Date().toISOString().split("T")[0] }
      }));
    }
  }, [location.state]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await addDoc(collection(db, "inspection_reports"), {
        ...reportData,
        technique: "Visual",
        inspector: user?.displayName || "Field Tech",
        timestamp: serverTimestamp(),
      });
      toast.success("Visual Inspection Dispatched");
      navigate("/admin/inspection-logs");
    } catch (error) {
      toast.error("Sync Failed: " + error.message);
    } finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-5xl mx-auto">
            
            <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg hover:text-orange-500 transition-colors"><ChevronLeft size={20} /></button>
                <h1 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                  <Eye className="text-orange-500" /> Visual Inspection Hub
                </h1>
              </div>
              <button onClick={handleSave} disabled={isSaving} className="bg-orange-600 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-orange-700 shadow-lg disabled:opacity-50">
                <Save size={14} /> {isSaving ? "Syncing..." : "Finalize Report"}
              </button>
            </header>

            {/* TAB NAV */}
            <div className="flex gap-8 border-b border-slate-800 mb-8">
              {["general", "observations", "evidence"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === tab ? "text-orange-500 border-b-2 border-orange-500" : "text-slate-500"}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 min-h-[500px]">
              {activeTab === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                  <InputField label="Client Identity" value={reportData.general.client} readOnly />
                  <InputField label="Asset Tag" value={reportData.general.tag} readOnly />
                  <div className="md:col-span-2 grid grid-cols-3 gap-6 pt-6 border-t border-slate-800">
                    <SelectField label="Lighting Condition" options={["Natural", "Torch Light", "Standard"]} value={reportData.conditions.lighting} onChange={(v) => setReportData({...reportData, conditions: {...reportData.conditions, lighting: v}})} />
                    <SelectField label="Surface State" options={["As-is", "Cleaned", "Painted", "Corroded"]} value={reportData.conditions.surface} onChange={(v) => setReportData({...reportData, conditions: {...reportData.conditions, surface: v}})} />
                    <SelectField label="Access Method" options={["Scaffolding", "Rope Access", "Ground Level"]} value={reportData.conditions.access} onChange={(v) => setReportData({...reportData, conditions: {...reportData.conditions, access: v}})} />
                  </div>
                </div>
              )}

              {activeTab === "observations" && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                        <th className="pb-4">Component Area</th>
                        <th className="pb-4">Assessment</th>
                        <th className="pb-4">Technical Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {reportData.observations.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="py-4 text-xs font-bold text-white uppercase">{item.component}</td>
                          <td className="py-4">
                            <select className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] uppercase font-bold text-orange-500 outline-none"
                              value={item.condition}
                              onChange={(e) => {
                                const newObs = [...reportData.observations];
                                newObs[idx].condition = e.target.value;
                                setReportData({...reportData, observations: newObs});
                              }}
                            >
                              <option>Satisfactory</option>
                              <option>Non-Conformity</option>
                              <option>Requires Maintenance</option>
                            </select>
                          </td>
                          <td className="py-4">
                            <input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2 text-xs text-slate-300" 
                              placeholder="Add descriptive findings..."
                              value={item.notes}
                              onChange={(e) => {
                                const newObs = [...reportData.observations];
                                newObs[idx].notes = e.target.value;
                                setReportData({...reportData, observations: newObs});
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Reusable UI components for consistent look
const InputField = ({ label, value, readOnly = false }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <input readOnly={readOnly} value={value} className={`w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none ${readOnly && 'opacity-50 cursor-not-allowed'}`} />
  </div>
);

const SelectField = ({ label, options, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500 cursor-pointer">
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default VisualReport;