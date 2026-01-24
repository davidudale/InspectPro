import React, { useState, useEffect } from "react";
import { db } from "../../../Auth/firebase";
import { 
  collection, onSnapshot, query, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, orderBy 
} from "firebase/firestore";
import { 
  Database, Activity, Plus, Trash2, Edit2, 
  Search, X, Cog, Info, Package, AlertTriangle, 
  Layers, MapPin, Ruler, HardHat
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";

const REFINERY_ASSET_TYPES = [
  { label: "Pressure Vessel (V)", prefix: "V-", category: "Static" },
  { label: "Heat Exchanger (E)", prefix: "E-", category: "Static" },
  { label: "Storage Tank (T)", prefix: "T-", category: "Static" },
  { label: "Distillation Column (C)", prefix: "C-", category: "Static" },
  { label: "Centrifugal Pump (P)", prefix: "P-", category: "Rotating" },
  { label: "Compressor (K)", prefix: "K-", category: "Rotating" },
  { label: "Fired Heater / Furnace (F)", prefix: "F-", category: "Static" },
  { label: "Piping Circuit (PI)", prefix: "PI-", category: "Piping" },
  { label: "Reactors (R)", prefix: "R-", category: "Static" },
];

const EquipmentManager = () => {
  const [equipment, setEquipment] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  
  const [newAsset, setNewAsset] = useState({
    tagNumber: "", description: "", locationId: "", locationName: "",
    nominalThickness: "", materialSpec: "", service: "Hydrocarbon",
    status: "In-Service", assetType: ""
  });

  useEffect(() => {
    const qAssets = query(collection(db, "equipment"), orderBy("tagNumber", "asc"));
    const unsubAssets = onSnapshot(qAssets, (snapshot) => {
      setEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qLocs = query(collection(db, "locations"), orderBy("name", "asc"));
    const unsubLocs = onSnapshot(qLocs, (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubAssets(); unsubLocs(); };
  }, []);

  const handleTypeChange = (typeName) => {
    const selected = REFINERY_ASSET_TYPES.find(t => t.label === typeName);
    if (selected) {
      setNewAsset({
        ...newAsset,
        assetType: selected.label,
        description: selected.label,
        tagNumber: editingId ? newAsset.tagNumber : selected.prefix 
      });
    }
  };

  const handleOpenEdit = (asset) => {
    setEditingId(asset.id);
    setNewAsset(asset);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, tag) => {
    if (window.confirm(`CRITICAL ACTION: Purge asset ${tag} from the registry?`)) {
      try {
        await deleteDoc(doc(db, "equipment", id));
        toast.error(`${tag} purged successfully`);
      } catch (err) {
        toast.error("Deletion failed");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "equipment", editingId), { ...newAsset, updatedAt: serverTimestamp() });
        toast.success("Technical specifications updated");
      } else {
        await addDoc(collection(db, "equipment"), { ...newAsset, createdAt: serverTimestamp() });
        toast.success("Asset registered in master directory");
      }
      handleCloseModal();
    } catch (err) {
      toast.error("Process failed");
    } finally { setIsSubmitting(false); }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewAsset({ tagNumber: "", description: "", locationId: "", locationName: "", nominalThickness: "", materialSpec: "", service: "Hydrocarbon", status: "In-Service", assetType: "" });
  };

  const filteredEquipment = equipment.filter(asset => 
    asset.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assetType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            
            {/* Header & Advanced Filter */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">Asset Inventory</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Refinery Equipment Management</p>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative group w-full md:w-80">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search by Tag, Location, or Type..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs focus:border-orange-500 outline-none transition-all backdrop-blur-sm shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 transition-all active:scale-95">
                  <Plus size={16}/> Register Asset
                </button>
              </div>
            </div>

            {/* TABULAR INTERFACE */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-20">Icon</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tag Number</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Facility Location</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Specs (Thk/Mat)</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredEquipment.map((asset) => (
                      <tr key={asset.id} className="group hover:bg-white/5 transition-colors">
                        <td className="p-6 text-center">
                          <div className="w-10 h-10 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-orange-500 mx-auto shadow-inner group-hover:border-orange-500/50 transition-colors">
                            <Cog size={18} />
                          </div>
                        </td>
                        <td className="p-6">
                          <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-orange-500 transition-colors">{asset.tagNumber}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{asset.assetType}</p>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin size={12} className="text-slate-600" />
                            <span className="text-xs font-medium uppercase">{asset.locationName}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
                              <Ruler size={10} className="text-orange-500" /> {asset.nominalThickness} mm
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase">
                              <Layers size={10} className="text-slate-700" /> {asset.materialSpec}
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            asset.status === 'In-Service' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-red-500/30 text-red-500 bg-red-500/5'
                          }`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEdit(asset)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 transition-all shadow-inner">
                              <Edit2 size={14}/>
                            </button>
                            <button onClick={() => handleDelete(asset.id, asset.tagNumber)} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-inner">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredEquipment.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                   <AlertTriangle size={40} className="text-slate-800 mb-4" />
                   <p className="text-[10px] font-bold uppercase text-slate-600 tracking-widest">No assets matching criteria</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Unified Registration/Edit Modal Remains Same */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
               <Package className="text-orange-500" /> {editingId ? "Update Asset" : "Register Asset"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Equipment Type</label>
                  <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500"
                    value={newAsset.assetType} onChange={(e) => handleTypeChange(e.target.value)}>
                    <option value="">Select Asset Type...</option>
                    {REFINERY_ASSET_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                  </select>
                </div>
                <SetupInput label="Tag Number" value={newAsset.tagNumber} onChange={(v) => setNewAsset({...newAsset, tagNumber: v})} placeholder="e.g. V-101" />
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Assign to Facility</label>
                  <select required className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white outline-none focus:border-orange-500"
                    value={newAsset.locationId}
                    onChange={(e) => {
                      const loc = locations.find(l => l.id === e.target.value);
                      setNewAsset({...newAsset, locationId: loc.id, locationName: loc.name});
                    }}>
                    <option value="">Select Location...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <SetupInput label="Nominal Thk (mm)" value={newAsset.nominalThickness} onChange={(v) => setNewAsset({...newAsset, nominalThickness: v})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <SetupInput label="Material Spec" value={newAsset.materialSpec} onChange={(v) => setNewAsset({...newAsset, materialSpec: v})} />
                <SetupInput label="Process Service" value={newAsset.service} onChange={(v) => setNewAsset({...newAsset, service: v})} />
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
    </div>
  );
};

const SetupInput = ({ label, value, onChange, placeholder }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <input className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none shadow-inner"
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export default EquipmentManager;