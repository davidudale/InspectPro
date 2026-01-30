import React, { useState, useEffect } from "react";
import { db } from "../../../Auth/firebase";
import { 
  collection, onSnapshot, query, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, orderBy 
} from "firebase/firestore";
import { 
  ShieldCheck, Plus, Trash2, Edit2, Search, X, Zap, AlertTriangle
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";

// Define Technical Options for Dropdowns
const STANDARD_OPTIONS = [
  { title: "API 510", fullName: "Pressure Vessel Inspection Code" },
  { title: "API 570", fullName: "Piping Inspection Code" },
  { title: "API 653", fullName: "Tank Inspection & Repair Code" },
  { title: "API 579", fullName: "Fitness-For-Service (FFS)" },
  { title: "ASME B31.3", fullName: "Process Piping Design" },
  { title: "ASME Section VIII", fullName: "Rules for Construction of Pressure Vessels" }
];

const CATEGORIES = ["Static Equipment", "Piping Systems", "Rotating Equipment", "Engineering Evaluation"];
const DESIGN_CODES = ["ASME Section VIII", "ASME B31.3", "API 650", "ASME B31.8", "ASME FFS-1"];

const InspectionTypeManager = () => {
  const [types, setTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newType, setNewType] = useState({
    title: "",
    fullName: "",
    category: "Static Equipment",
    defaultStandard: "ASME Section VIII",
    requiredTechniques: ["Visual", "Detailed", "AUT", "MUT", "Pulsed Eddy Current", "Radiography"]
  });

  const availableTechniques = ["Visual", "Detailed", "AUT", "MUT", "Pulsed Eddy Current", "Radiography"];

  useEffect(() => {
    const q = query(collection(db, "inspection_types"), orderBy("title", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleStandardChange = (e) => {
    const selected = STANDARD_OPTIONS.find(opt => opt.title === e.target.value);
    if (selected) {
      setNewType({
        ...newType,
        title: selected.title,
        fullName: selected.fullName
      });
    } else {
      setNewType({ ...newType, title: e.target.value, fullName: "" });
    }
  };

  const handleToggleTechnique = (tech) => {
    const current = newType.requiredTechniques;
    setNewType({ 
        ...newType, 
        requiredTechniques: current.includes(tech) 
            ? current.filter(t => t !== tech) 
            : [...current, tech] 
    });
  };

  const handleEditOpen = (type) => {
    setEditingId(type.id);
    setNewType(type);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "inspection_types", editingId), {
          ...newType,
          updatedAt: serverTimestamp()
        });
        toast.success("Standard updated successfully");
      } else {
        await addDoc(collection(db, "inspection_types"), {
          ...newType,
          createdAt: serverTimestamp()
        });
        toast.success("New standard registered");
      }
      handleCloseModal();
    } catch (err) {
      toast.error("Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewType({ title: "", fullName: "", category: "Static Equipment", defaultStandard: "ASME Section VIII", requiredTechniques: ["Visual"] });
  };

  const filteredTypes = types.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">Inspection Types</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Configuration Hub</p>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative group w-full md:w-80">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search Protocols..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs focus:border-orange-500 outline-none transition-all shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                  <Plus size={16}/> Add Inspection Type
                </button>
              </div>
            </header>

            {/* TABULAR INTERFACE */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Code</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Description</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inspections</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredTypes.map((type) => (
                      <tr key={type.id} className="group hover:bg-white/5 transition-colors">
                        <td className="p-6">
                           <span className="text-sm font-bold text-white uppercase group-hover:text-orange-500 transition-colors">{type.title}</span>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-medium text-slate-400">{type.fullName}</p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">Ref: {type.defaultStandard}</p>
                        </td>
                        <td className="p-6">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">{type.category}</span>
                        </td>
                        <td className="p-6">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">{type.requiredTechniques}</span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditOpen(type)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 transition-all shadow-inner">
                              <Edit2 size={14}/>
                            </button>
                            <button onClick={() => handleDelete(type.id, type.title)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-inner">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL SECTION WITH DROPDOWNS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
            <button onClick={handleCloseModal} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
                <X size={20}/>
            </button>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8">{editingId ? "Modify Protocol" : "Register Protocol"}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Standard Title Dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Regulatory Standard</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none transition-all shadow-inner cursor-pointer"
                    value={newType.title}
                    onChange={handleStandardChange}
                    required
                  >
                    <option value="" disabled>Select Code (e.g. API 510)...</option>
                    {STANDARD_OPTIONS.map(opt => (
                      <option key={opt.title} value={opt.title}>{opt.title}</option>
                    ))}
                  </select>
                </div>

                {/* Reference Name (Auto-filled based on selection) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Reference Name</label>
                  <input 
                    readOnly 
                    className="w-full bg-slate-900/50 border border-slate-800 p-4 rounded-2xl text-sm text-slate-400 outline-none cursor-not-allowed"
                    value={newType.fullName}
                    placeholder="Auto-fills based on selection"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* Category Dropdown */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500 cursor-pointer"
                            value={newType.category} 
                            onChange={(e) => setNewType({...newType, category: e.target.value})}
                        >
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    {/* Design Code Dropdown */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Design Code</label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500 cursor-pointer"
                            value={newType.defaultStandard} 
                            onChange={(e) => setNewType({...newType, defaultStandard: e.target.value})}
                        >
                            {DESIGN_CODES.map(code => <option key={code} value={code}>{code}</option>)}
                        </select>
                    </div>
                </div>

                {/* Multi-Select Techniques Section */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Included NDE Techniques</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTechniques.map(tech => (
                      <button key={tech} type="button" onClick={() => handleToggleTechnique(tech)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-bold uppercase transition-all border ${
                          newType.requiredTechniques.includes(tech) ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={handleCloseModal} className="flex-1 py-4 text-[10px] font-bold uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-orange-600 py-4 rounded-2xl text-[10px] font-bold uppercase text-white shadow-lg hover:bg-orange-700 transition-all shadow-orange-900/20">
                        {isSubmitting ? "Syncing..." : editingId ? "Update Standard" : "Authorize Entry"}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionTypeManager;