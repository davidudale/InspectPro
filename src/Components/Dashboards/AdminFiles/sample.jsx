import React, { useState, useEffect } from "react";
import { db } from "../../../Auth/firebase";
import { 
  collection, onSnapshot, query, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, orderBy 
} from "firebase/firestore";
import { 
  Plus, Trash2, Edit2, Search, X, Cog, Package, AlertTriangle, 
  Layers, Ruler, Droplets, Factory, Check
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";

const EquipmentManager = () => {
  const [equipment, setEquipment] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);

  // --- NEW: DYNAMIC OPTION STATES ---
  const [assetTypes, setAssetTypes] = useState([
    { label: "Pressure Vessel (V)", prefix: "V-", category: "Static" },
    { label: "Heat Exchanger (E)", prefix: "E-", category: "Static" },
    { label: "Storage Tank (T)", prefix: "T-", category: "Static" },
    { label: "Centrifugal Pump (P)", prefix: "P-", category: "Rotating" },
    { label: "Steam Turbine (ST)", prefix: "ST-", category: "Rotating" },
    { label: "Piping Circuit (PI)", prefix: "PI-", category: "Piping" },
  ]);
  const [statuses, setStatuses] = useState(["In-Service", "Out-of-Service", "Mothballed", "Decommissioned"]);
  const [services, setServices] = useState(["Hydrocarbon", "Steam", "Cooling Water", "Flare Gas", "Lube Oil"]);

  // --- NEW: TOGGLE STATES ---
  const [addingField, setAddingField] = useState(null); // 'type', 'service', or 'status'
  const [tempValue, setTempValue] = useState("");

  const [newAsset, setNewAsset] = useState({
    tagNumber: "", 
    description: "",
    nominalThickness: "", 
    materialSpec: "", 
    service: "Hydrocarbon",
    status: "In-Service", 
    assetType: ""
  });

  useEffect(() => {
    const qAssets = query(collection(db, "equipment"), orderBy("tagNumber", "asc"));
    const unsubAssets = onSnapshot(qAssets, (snapshot) => {
      setEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubAssets();
  }, []);

  const handleTypeChange = (typeName) => {
    if (typeName === "ADD_NEW") {
      setAddingField('type');
      return;
    }
    const selected = assetTypes.find(t => t.label === typeName);
    if (selected) {
      setNewAsset({
        ...newAsset,
        assetType: selected.label,
        description: selected.label,
        tagNumber: editingId ? newAsset.tagNumber : ""
      });
    }
  };

  const handleAddCustom = () => {
    if (!tempValue.trim()) {
      setAddingField(null);
      return;
    }

    if (addingField === 'type') {
      const newEntry = { label: tempValue, prefix: "C-", category: "Custom" };
      setAssetTypes([...assetTypes, newEntry]);
      setNewAsset({ ...newAsset, assetType: tempValue, description: tempValue });
    } else if (addingField === 'service') {
      setServices([...services, tempValue]);
      setNewAsset({ ...newAsset, service: tempValue });
    } else if (addingField === 'status') {
      setStatuses([...statuses, tempValue]);
      setNewAsset({ ...newAsset, status: tempValue });
    }

    setTempValue("");
    setAddingField(null);
    toast.info("Custom option added");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setAddingField(null);
    setNewAsset({ tagNumber: "", description: "", nominalThickness: "", materialSpec: "", service: "Hydrocarbon", status: "In-Service", assetType: "" });
  };

  // ... (handleOpenEdit, handleDelete, handleSubmit remain the same)

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8">
          {/* ... Header and Table (remains the same) ... */}

          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
                <button onClick={handleCloseModal} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                   <Package className="text-orange-500" /> {editingId ? "Modify Equipment" : "Add Equipment"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* EQUIPMENT TYPE WITH ADD MORE */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Equipment Type</label>
                      {addingField === 'type' ? (
                        <div className="flex gap-2 animate-in slide-in-from-top-1">
                          <input autoFocus className="flex-1 bg-slate-950 border border-orange-500/40 p-4 rounded-2xl text-sm text-white outline-none" 
                            placeholder="New type..." value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
                          <button type="button" onClick={handleAddCustom} className="bg-orange-600 p-4 rounded-2xl text-white"><Check size={18}/></button>
                        </div>
                      ) : (
                        <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none cursor-pointer"
                          value={newAsset.assetType} onChange={(e) => handleTypeChange(e.target.value)}>
                          <option value="">Select Equipment...</option>
                          {assetTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                          <option value="ADD_NEW" className="text-orange-500 font-bold">+ Add More</option>
                        </select>
                      )}
                    </div>

                    <SetupInput label="Equipment Code" value={newAsset.tagNumber} onChange={(v) => setNewAsset({...newAsset, tagNumber: v})} placeholder="e.g. V-101" />
                    <SetupInput label="Material Spec" value={newAsset.materialSpec} onChange={(v) => setNewAsset({...newAsset, materialSpec: v})} placeholder="ASTM A516" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PROCESS SERVICE WITH ADD MORE */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Process Service</label>
                      {addingField === 'service' ? (
                        <div className="flex gap-2 animate-in slide-in-from-top-1">
                          <input autoFocus className="flex-1 bg-slate-950 border border-orange-500/40 p-4 rounded-2xl text-sm text-white outline-none" 
                            placeholder="New service..." value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
                          <button type="button" onClick={handleAddCustom} className="bg-orange-600 p-4 rounded-2xl text-white"><Check size={18}/></button>
                        </div>
                      ) : (
                        <select className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                          value={newAsset.service} onChange={(e) => e.target.value === 'ADD_NEW' ? setAddingField('service') : setNewAsset({...newAsset, service: e.target.value})}>
                          {services.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="ADD_NEW" className="text-orange-500 font-bold">+ Add More</option>
                        </select>
                      )}
                    </div>

                    {/* ASSET STATUS WITH ADD MORE */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Asset Status</label>
                      {addingField === 'status' ? (
                        <div className="flex gap-2 animate-in slide-in-from-top-1">
                          <input autoFocus className="flex-1 bg-slate-950 border border-orange-500/40 p-4 rounded-2xl text-sm text-white outline-none" 
                            placeholder="New status..." value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
                          <button type="button" onClick={handleAddCustom} className="bg-orange-600 p-4 rounded-2xl text-white"><Check size={18}/></button>
                        </div>
                      ) : (
                        <select className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                          value={newAsset.status} onChange={(e) => e.target.value === 'ADD_NEW' ? setAddingField('status') : setNewAsset({...newAsset, status: e.target.value})}>
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="ADD_NEW" className="text-orange-500 font-bold">+ Add More</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={handleCloseModal} className="flex-1 py-4 text-[10px] font-bold uppercase text-slate-500">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-orange-600 py-4 rounded-2xl text-[10px] font-bold uppercase text-white shadow-lg">
                      {isSubmitting ? "Processing..." : editingId ? "Sync Changes" : "Authorize Entry"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};