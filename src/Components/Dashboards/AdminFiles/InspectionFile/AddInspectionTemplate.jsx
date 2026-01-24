import React, { useState, useEffect } from "react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../Auth/AuthContext";
import { toast } from "react-toastify";
import {
  ClipboardCheck, ArrowLeft, Save, Activity, Tag, Plus,
  Trash2, MapPin, FileText, User, ShieldCheck, Briefcase
} from "lucide-react";

const AddInspectionTemplate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const locationState = useLocation();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]); 

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        setProjects(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        toast.error("Manifest Directory sync failed");
      }
    };
    fetchProjects();
  }, []);

  // FIXED: Added index for report generation logic
  const createNewRow = (overrides = {}, index = 0) => {
    // Generate a default Report No if one isn't provided
    const projId = overrides.projectId || "NEW";
    const tag = overrides.tagNumber || overrides.reference || "GEN";
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    
    return {
      id: Date.now() + Math.random(),
      type: "AUT",
      reference: overrides.tagNumber || overrides.reference || "", 
      Client: overrides.client || "",
      clientLogo: overrides.clientLogo || "", // Mapped from Client Management
      Location: overrides.location || "",
      Equipment: overrides.description || overrides.Equipment || "",
      Report_No: overrides.Report_No || `NDE-${projId}-${tag}-${datePart}-${index + 1}`,
      Contract_Number: overrides.contractNumber || "",
      Date_of_Inspection: overrides.startDate || new Date().toISOString().split('T')[0],
      Inspected_By: user?.displayName || "Lead Inspector",
      Vessel_Operating_Procedures: "Standard NDE Protocol",
      Test_Code: overrides.inspectionType || "API 510",
      Acceptance_Criteria: "Clients requirement"
    };
  };

  const [inspectionItems, setInspectionItems] = useState([createNewRow()]);

  // FIXED: Added defensive checks and correct indexing
  const handleProjectSelect = (projectId) => {
    const selected = projects.find(p => p.id === projectId || p.projectId === projectId);
    
    if (selected) {
      if (selected.assignedEquipment && selected.assignedEquipment.length > 0) {
        const automatedRows = selected.assignedEquipment.map((asset, idx) => createNewRow({
          ...selected,
          tagNumber: asset.tagNumber,
          description: asset.description
        }, idx)); // Passing index for unique Report_No
        setInspectionItems(automatedRows);
      } else {
        setInspectionItems([createNewRow(selected, 0)]);
      }
      toast.success(`Project Context Synced: ${selected.projectName}`);
    } else {
      setInspectionItems([createNewRow()]);
    }
  };

  useEffect(() => {
    const context = locationState.state?.projectContext;
    if (context) {
      if (context.equipment?.length > 0) {
        setInspectionItems(context.equipment.map((asset, idx) => createNewRow({
          ...context,
          tagNumber: asset.tagNumber,
          description: asset.description
        }, idx)));
      } else {
        setInspectionItems([createNewRow(context, 0)]);
      }
    }
  }, [locationState.state]);

  const handleInputChange = (id, field, value) => {
    setInspectionItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "inspections"), {
        items: inspectionItems,
        inspectorName: user?.displayName || "Unknown",
        inspectorId: user?.uid,
        timestamp: serverTimestamp(),
      });
      toast.success("Technical Manifest Deployed");
      navigate("/admin/inspections");
    } catch (error) {
      toast.error("Database Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 relative">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-5xl mx-auto">
            
            <header className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-600/20 rounded-2xl border border-orange-500/20 shadow-xl">
                    <ShieldCheck className="text-orange-500" size={32} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">Manifest Deployment</h1>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">NDE Technical Protocol Initialization</p>
                  </div>
               </div>
            </header>

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2.5rem] mb-10 backdrop-blur-md shadow-2xl">
                <label className="flex items-center gap-2 text-[10px] font-bold text-orange-500 uppercase tracking-[0.3em] mb-4">
                    <Briefcase size={14} /> Operational Manifest Selection
                </label>
                <select 
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white text-xs focus:border-orange-500 outline-none transition-all shadow-inner cursor-pointer"
                >
                    <option value="">Select Project Reference...</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.projectId} — {p.client} | {p.projectName}
                        </option>
                    ))}
                </select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {inspectionItems.map((item, index) => (
                <div key={item.id} className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-md relative animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.3em]">Technical Unit #{index + 1}</span>
                    <button type="button" onClick={() => setInspectionItems(inspectionItems.filter(i => i.id !== item.id))} className="p-2 bg-slate-800 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="Client" icon={<User size={12}/>} value={item.Client} onChange={(v) => handleInputChange(item.id, "Client", v)} />
                    <InputField label="Location" icon={<MapPin size={12}/>} value={item.Location} onChange={(v) => handleInputChange(item.id, "Location", v)} />
                    <InputField label="Equipment" icon={<ShieldCheck size={12}/>} value={item.Equipment} onChange={(v) => handleInputChange(item.id, "Equipment", v)} />
                    <InputField label="Asset Tag" icon={<Tag size={12}/>} value={item.reference} onChange={(v) => handleInputChange(item.id, "reference", v)} />
                    <InputField label="Report No" icon={<FileText size={12}/>} value={item.Report_No} onChange={(v) => handleInputChange(item.id, "Report_No", v)} />
                    <InputField label="Technical Code" icon={<Activity size={12}/>} value={item.Test_Code} onChange={(v) => handleInputChange(item.id, "Test_Code", v)} />
                  </div>
                </div>
              ))}

              <div className="flex gap-4">
                <button type="button" onClick={() => setInspectionItems([...inspectionItems, createNewRow({}, inspectionItems.length)])} className="flex-1 bg-slate-900 border border-slate-800 py-6 rounded-[2rem] font-bold uppercase text-[10px] tracking-widest text-slate-400 hover:text-orange-500 transition-all">Add Manual Row</button>
                <button type="submit" disabled={loading} className="flex-[2] bg-orange-600 hover:bg-orange-700 py-6 rounded-[2rem] font-bold uppercase tracking-[0.3em] text-white shadow-2xl transition-all active:scale-95">
                  {loading ? "Processing Hub..." : "Deploy Technical Manifest"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

const InputField = ({ label, icon, value, onChange }) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{icon} {label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-xs focus:border-orange-500 outline-none transition-all shadow-inner"
    />
  </div>
);

export default AddInspectionTemplate;