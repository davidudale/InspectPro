import React, { useState, useEffect } from "react";
import { db } from "../../../Auth/firebase";
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  Cog,
  Package,
  AlertTriangle,
  Layers,
  Ruler,
  Droplets,
  Factory,
  Container,
} from "lucide-react";
import AdminNavbar from "../../AdminNavbar";
import AdminSidebar from "../../AdminSidebar";
import { toast } from "react-toastify";

// Expanded list including major Oil & Gas equipment categories

const EquipmentManager = () => {
  const [equipment, setEquipment] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [assetTypes, setAssetTypes] = useState([
    // Static Equipment
    { label: "Pressure Vessel (V)", prefix: "V-", category: "Static" },
    { label: "Heat Exchanger (E)", prefix: "E-", category: "Static" },
    { label: "Storage Tank (T)", prefix: "T-", category: "Static" },
    { label: "Distillation Column (C)", prefix: "C-", category: "Static" },
    { label: "Fired Heater / Furnace (F)", prefix: "F-", category: "Static" },
    { label: "Reactors (R)", prefix: "R-", category: "Static" },
    { label: "Separator (S)", prefix: "S-", category: "Static" },
    { label: "Boiler (B)", prefix: "B-", category: "Static" },
    // Rotating Equipment
    { label: "Centrifugal Pump (P)", prefix: "P-", category: "Rotating" },
    { label: "Reciprocating Pump (RP)", prefix: "RP-", category: "Rotating" },
    { label: "Centrifugal Compressor (K)", prefix: "K-", category: "Rotating" },
    {
      label: "Reciprocating Compressor (RK)",
      prefix: "RK-",
      category: "Rotating",
    },
    { label: "Gas Turbine (GT)", prefix: "GT-", category: "Rotating" },
    { label: "Steam Turbine (ST)", prefix: "ST-", category: "Rotating" },
    // Piping & Others
    { label: "Piping Circuit (PI)", prefix: "PI-", category: "Piping" },
    { label: "Flare Stack (FS)", prefix: "FS-", category: "Infrastructure" },
    { label: "Pig Launcher/Receiver (PL)", prefix: "PL-", category: "Piping" },
    {
      label: "Christmas Tree (XT)",
      prefix: "XT-",
      category: "Subsea/Wellhead",
    },
  ]);

  const [statuses, setStatuses] = useState([
    "In-Service",
    "Out-of-Service",
    "Mothballed",
    "Decommissioned",
  ]);
  const [services, setServices] = useState([
    "Hydrocarbon",
    "Steam",
    "Cooling Water",
    "Flare Gas",
    "Lube Oil",
  ]);

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
    assetType: "",
  });

  useEffect(() => {
    const qAssets = query(
      collection(db, "equipment"),
      orderBy("tagNumber", "asc"),
    );
    const unsubAssets = onSnapshot(qAssets, (snapshot) => {
      setEquipment(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubAssets();
  }, []);

  const handleTypeChange = (typeName) => {
    // FIX: Check for the 'Add More' value before searching the array
    if (typeName === "ADD_NEW") {
      setAddingField("type");
      return;
    }

    const selected = assetTypes.find((t) => t.label === typeName);
    if (selected) {
      setNewAsset({
        ...newAsset,
        assetType: selected.label,
        description: selected.label,
        tagNumber: editingId ? newAsset.tagNumber : "",
      });
    }
  };

  const handleOpenEdit = (asset) => {
    setEditingId(asset.id);
    setNewAsset(asset);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, tag) => {
    if (window.confirm(`CRITICAL: Remove Equipment ${tag} from master registry?`)) {
      try {
        await deleteDoc(doc(db, "equipment", id));
        toast.error(`${tag} Removed successfully`);
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
        await updateDoc(doc(db, "equipment", editingId), {
          ...newAsset,
          updatedAt: serverTimestamp(),
        });
        toast.success("Equipment updated");
      } else {
        await addDoc(collection(db, "equipment"), {
          ...newAsset,
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, "activity_logs"), {
                message: `Equipment Added: ${newAsset.description}`,
                target: "",
                userEmail: "",
                type: "info",
                timestamp: serverTimestamp(),
              });
        
        toast.success("New Equipment added");
      }
      handleCloseModal();
    } catch (err) {
      toast.error("Database sync failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustom = () => {
    if (!tempValue.trim()) {
      setAddingField(null);
      return;
    }

    if (addingField === "type") {
      const newEntry = { label: tempValue, prefix: "C-", category: "Custom" };
      setAssetTypes([...assetTypes, newEntry]);
      setNewAsset({
        ...newAsset,
        assetType: tempValue,
        description: tempValue,
      });
    } else if (addingField === "service") {
      setServices([...services, tempValue]);
      setNewAsset({ ...newAsset, service: tempValue });
    } else if (addingField === "status") {
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
    setNewAsset({
      tagNumber: "",
      description: "",
      nominalThickness: "",
      materialSpec: "",
      service: "Hydrocarbon",
      status: "In-Service",
      assetType: "",
    });
  };

  const filteredEquipment = equipment.filter(
    (asset) =>
      asset.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.materialSpec.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-16 lg:ml-64 p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-10 gap-6">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-white">
                  Equipments
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                  Comprehensive Equipment Registry
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative group w-full md:w-80">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Search by Tag, Type, or Material..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs focus:border-orange-500 outline-none transition-all backdrop-blur-sm shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Plus size={16} /> Add Equipment
                </button>
              </div>
            </div>

            {/* TABULAR INTERFACE */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Asset Identity
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Category
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Technical Specs
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Process / Status
                      </th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredEquipment.map((asset) => (
                      <tr
                        key={asset.id}
                        className="group hover:bg-white/5 transition-colors"
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-orange-500">
                              <Cog size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-orange-500 transition-colors">
                                {asset.description}
                              </p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">
                                {asset.tagNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <Factory size={12} className="text-slate-600" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {assetTypes.find(
                                (t) => t.label === asset.assetType,
                              )?.category || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
                              <Ruler size={10} className="text-orange-500" />{" "}
                              {asset.nominalThickness} mm
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase">
                              <Layers size={10} className="text-slate-700" />{" "}
                              {asset.materialSpec}
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <Droplets size={10} className="text-blue-500" />{" "}
                              {asset.service}
                            </span>
                            <span
                              className={`w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                                asset.status === "In-Service"
                                  ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                                  : "border-red-500/30 text-red-500 bg-red-500/5"
                              }`}
                            >
                              {asset.status}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEdit(asset)}
                              className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 transition-all shadow-inner"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(asset.id, asset.tagNumber)
                              }
                              className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-inner"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredEquipment.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center opacity-40">
                  <AlertTriangle size={40} className="mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    No assets matching query
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
            <button
              onClick={handleCloseModal}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
              <Package className="text-orange-500" />{" "}
              {editingId ? "Modify Equipment" : "Add Equipment"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EQUIPMENT TYPE WITH ADD MORE */}
                <div className="space-y-2 min-w-[120%] ">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Equipment 
                  </label>
                  {addingField === "type" ? (
                    <div className="flex gap-2 animate-in  slide-in-from-top-1">
                      <input
                        autoFocus
                        className=" w-full bg-slate-950  border border-orange-500/40 p-4 rounded-2xl text-sm text-white outline-none"
                        placeholder="New type..."
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustom}
                        className="bg-orange-600 p-4 rounded-2xl text-white"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none cursor-pointer"
                      value={newAsset.assetType}
                      onChange={(e) => handleTypeChange(e.target.value)}
                    >
                      <option value="">Select Equipment...</option>
                      {assetTypes.map((t) => (
                        <option key={t.label} value={t.label}>
                          {t.label}
                        </option>
                      ))}
                      <option
                        value="ADD_NEW"
                        className="text-orange-500 font-bold"
                      >
                        + Add More
                      </option>
                    </select>
                  )}
                </div>
              </div>
              <div className="flex flex-1">
                <SetupInput
                  label="Equipment Code"
                  value={newAsset.tagNumber}
                  onChange={(v) => setNewAsset({ ...newAsset, tagNumber: v })}
                  placeholder="e.g. V-101"
                />
                <SetupInput
                  label="Material Spec"
                  value={newAsset.materialSpec}
                  onChange={(v) =>
                    setNewAsset({ ...newAsset, materialSpec: v })
                  }
                  placeholder="ASTM A516"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PROCESS SERVICE WITH ADD MORE */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Process Service
                  </label>
                  {addingField === "service" ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-1">
                      <input
                        autoFocus
                        className="flex-1 bg-slate-950 border border-orange-500/40 p-4 rounded-2xl text-sm text-white outline-none"
                        placeholder="New service..."
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustom}
                        className="bg-orange-600 p-4 rounded-2xl text-white"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                      value={newAsset.service}
                      onChange={(e) =>
                        e.target.value === "ADD_NEW"
                          ? setAddingField("service")
                          : setNewAsset({
                              ...newAsset,
                              service: e.target.value,
                            })
                      }
                    >
                      {services.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option
                        value="ADD_NEW"
                        className="text-orange-500 font-bold"
                      >
                        + Add More
                      </option>
                    </select>
                  )}
                </div>

                {/* ASSET STATUS WITH ADD MORE */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Asset Status
                  </label>
                  {addingField === "status" ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-1">
                      <input
                        autoFocus
                        className="flex-1 bg-slate-950 border border-orange-500/40 p-4 rounded-2xl text-sm text-white outline-none"
                        placeholder="New status..."
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustom}
                        className="bg-orange-600 p-4 rounded-2xl text-white"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none"
                      value={newAsset.status}
                      onChange={(e) =>
                        e.target.value === "ADD_NEW"
                          ? setAddingField("status")
                          : setNewAsset({ ...newAsset, status: e.target.value })
                      }
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option
                        value="ADD_NEW"
                        className="text-orange-500 font-bold"
                      >
                        + Add More
                      </option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-4 text-[10px] font-bold uppercase text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-600 py-4 rounded-2xl text-[10px] font-bold uppercase text-white shadow-lg"
                >
                  {isSubmitting
                    ? "Processing..."
                    : editingId
                      ? "Sync Changes"
                      : "Authorize Entry"}
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
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
      {label}
    </label>
    <input
      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm text-white focus:border-orange-500 outline-none shadow-inner transition-all"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export default EquipmentManager;
