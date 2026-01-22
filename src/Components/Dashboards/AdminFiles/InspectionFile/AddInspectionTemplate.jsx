import React, { useState } from "react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { db } from "../../../Auth/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Auth/AuthContext";
import { toast } from "react-toastify";
import {
  ClipboardCheck,
  ArrowLeft,
  Save,
  Activity,
  Tag,
  Plus,
  Trash2,
  MapPin,
  FileText,
  User,
  ShieldCheck
} from "lucide-react";

const AddInspectionTemplate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Template for a new technical row
  const createNewRow = () => ({
    id: Date.now() + Math.random(), // Unique ID for key tracking
    type: "AUT",
    reference: "",
    Client: "",
    Location: "",
    Equipment: "",
    Report_No: "",
    Contract_Number: "",
    Date_of_Inspection: "",
    Inspected_By: user?.name || "",
    Vessel_Operating_Procedures: "",
    Test_Code: "API 510",
    Acceptance_Criteria: "Clients requirement"
  });

  const [inspectionItems, setInspectionItems] = useState([createNewRow()]);

  const addNewField = () => {
    setInspectionItems([...inspectionItems, createNewRow()]);
  };

  const removeField = (id) => {
    if (inspectionItems.length > 1) {
      setInspectionItems(inspectionItems.filter(item => item.id !== id));
    }
  };

  const handleInputChange = (id, field, value) => {
    const updatedItems = inspectionItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setInspectionItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "inspections"), {
        items: inspectionItems,
        inspectorName: user?.name || "Unknown Admin",
        inspectorId: user?.uid,
        timestamp: serverTimestamp(),
      });

      toast.success("Report Added");
      navigate("/admin/inspections");
    } catch (error) {
      console.error(error);
      toast.error("System Error: Could not save logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1 relative">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-4 lg:p-8 min-h-[calc(100vh-65px)] overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-5xl mx-auto">
            
            <button onClick={() => navigate("/admin/inspections")} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 mb-6 transition-colors group">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Back to Report Template View
            </button>

            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-600/20 rounded-2xl border border-orange-500/20">
                  <ClipboardCheck className="text-orange-500" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight uppercase">New Report Entry</h1>
                  <p className="text-slate-500 text-sm">Configure multiple technical Report headers.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {inspectionItems.map((item, index) => (
                <div key={item.id} className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md relative group animate-in fade-in slide-in-from-bottom-4 duration-300">
                  
                  {/* Row Header */}
                  <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-[0.3em]">Report Standard #{index + 1}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={addNewField} className="p-2 bg-orange-600/10 text-orange-500 rounded-lg border border-orange-600/20 hover:bg-orange-600 hover:text-white transition-all"><Plus size={16} /></button>
                      {inspectionItems.length > 1 && (
                        <button type="button" onClick={() => removeField(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Method Dropdown */}
                    <div className="md:col-span-1">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"><Activity size={12} /> Inspection Method</label>
                      <select
                        value={item.type}
                        onChange={(e) => handleInputChange(item.id, "type", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none transition-all"
                      >
                        <option value="AUT">AUT (Corrosion Mapping)</option>
                        <option value="DRT">DRT (Digital Radiography)</option>
                        <option value="MUT">MUT (Manual UT)</option>
                      </select>
                    </div>

                    {/* Technical Fields */}
                    <div className="md:col-span-1">
                      <InputField label="Client Name" icon={<User size={12}/>} value={item.Client} onChange={(v) => handleInputChange(item.id, "Client", v)} />
                    </div>
                    <div className="md:col-span-1">
                      <InputField label="Location/Platform" icon={<MapPin size={12}/>} value={item.Location} onChange={(v) => handleInputChange(item.id, "Location", v)} />
                    </div>
                    
                    <div className="md:col-span-1">
                      <InputField label="Equipment Name" icon={<ShieldCheck size={12}/>} value={item.Equipment} onChange={(v) => handleInputChange(item.id, "Equipment", v)} />
                    </div>
                    <div className="md:col-span-1">
                      <InputField label="Reference Tag" icon={<Tag size={12}/>} value={item.reference} onChange={(v) => handleInputChange(item.id, "reference", v)} />
                    </div>
                    <div className="md:col-span-1">
                      <InputField label="Report Number" icon={<FileText size={12}/>} value={item.Report_No} onChange={(v) => handleInputChange(item.id, "Report_No", v)} />
                    </div>

                    <div className="md:col-span-1">
                       <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Inspection Date</label>
                       <input type="date" value={item.Date_of_Inspection} onChange={(e) => handleInputChange(item.id, "Date_of_Inspection", e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none" />
                    </div>
                    <div className="md:col-span-1">
                      <InputField label="Test Code" value={item.Test_Code} onChange={(v) => handleInputChange(item.id, "Test_Code", v)} />
                    </div>
                    <div className="md:col-span-1">
                      <InputField label="Acceptance Criteria" value={item.Acceptance_Criteria} onChange={(v) => handleInputChange(item.id, "Acceptance_Criteria", v)} />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 text-white font-bold uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-orange-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <><Save size={18} /> Add New Report Template</>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

// Internal Sub-component for clean mapping
const InputField = ({ label, icon, value, onChange, placeholder }) => (
  <div>
    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
      {icon} {label}
    </label>
    <input
      type="text"
      placeholder={placeholder || `Enter ${label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none transition-all"
    />
  </div>
);

export default AddInspectionTemplate;